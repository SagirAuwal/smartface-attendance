import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../login_screen.dart';

class CoursesTab extends StatefulWidget {
  const CoursesTab({super.key});

  @override
  State<CoursesTab> createState() => _CoursesTabState();
}

class _CoursesTabState extends State<CoursesTab> {
  List<Map<String, dynamic>> _courses = [];
  List<Map<String, dynamic>> _filteredCourses = [];
  bool _isLoading = true;
  String _errorMessage = '';
  final _searchController = TextEditingController();
  Map<String, dynamic>? _currentUser;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    _searchController.addListener(_filterCourses);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });
    try {
      final user = await ApiService.getCurrentUser();
      final courses = await ApiService.getCourses();
      setState(() {
        _currentUser = user;
        _courses = courses;
        _filteredCourses = courses;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception:', '').trim();
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchCoursesOnly() async {
    try {
      final courses = await ApiService.getCourses();
      setState(() {
        _courses = courses;
        _filteredCourses = courses;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to refresh courses: $e")),
      );
    }
  }

  void _filterCourses() {
    final query = _searchController.text.toLowerCase().trim();
    setState(() {
      if (query.isEmpty) {
        _filteredCourses = _courses;
      } else {
        _filteredCourses = _courses.where((course) {
          final code = (course['course_code'] ?? '').toString().toLowerCase();
          final name = (course['course_name'] ?? '').toString().toLowerCase();
          final lecturer = course['lecturer'] ?? {};
          final lecturerName = (lecturer['fullname'] ?? '').toString().toLowerCase();
          return code.contains(query) || name.contains(query) || lecturerName.contains(query);
        }).toList();
      }
    });
  }

  Future<void> _handleLogout() async {
    await ApiService.logout();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  void _showAddCourseDialog() async {
    final formKey = GlobalKey<FormState>();
    final codeController = TextEditingController();
    final nameController = TextEditingController();
    int? selectedLecturerId;
    
    List<Map<String, dynamic>> lecturersList = [];
    bool dialogLoading = false;
    String? dialogError;
    
    final isAdmin = _currentUser?['role'] == 'admin';
    
    if (isAdmin) {
      setState(() {
        _isLoading = true;
      });
      try {
        lecturersList = await ApiService.getLecturers();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Failed to load lecturers: $e")),
        );
        setState(() {
          _isLoading = false;
        });
        return;
      }
      setState(() {
        _isLoading = false;
      });
    } else {
      // If it's a lecturer, they can only create courses for themselves
      selectedLecturerId = _currentUser?['id'] as int?;
    }

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFF334155)),
              ),
              title: const Row(
                children: [
                  Icon(Icons.bookmark_add, color: Color(0xFF06B6D4)),
                  SizedBox(width: 10),
                  Text("Add New Course", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (dialogError != null) ...[
                        Text(dialogError!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                        const SizedBox(height: 10),
                      ],
                      TextFormField(
                        controller: codeController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Course Code (e.g. CSC402)", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.isEmpty ? "Course code is required" : null,
                      ),
                      TextFormField(
                        controller: nameController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Course Name (e.g. Artificial Intelligence)", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.isEmpty ? "Course name is required" : null,
                      ),
                      
                      if (isAdmin) ...[
                        const SizedBox(height: 12),
                        DropdownButtonFormField<int>(
                          dropdownColor: const Color(0xFF1E293B),
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: const InputDecoration(labelText: "Assign Instructor (Lecturer)", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                          items: lecturersList.map((lec) {
                            final id = lec['id'] as int;
                            final fullname = lec['fullname'] ?? 'Lecturer';
                            return DropdownMenuItem(value: id, child: Text(fullname));
                          }).toList(),
                          onChanged: (val) {
                            selectedLecturerId = val;
                          },
                          validator: (v) => v == null ? "Instructor assignment is required" : null,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: dialogLoading ? null : () => Navigator.pop(context),
                  child: const Text("Cancel", style: TextStyle(color: Color(0xFF64748B))),
                ),
                ElevatedButton(
                  onPressed: dialogLoading
                      ? null
                      : () async {
                          if (!formKey.currentState!.validate()) return;
                          if (selectedLecturerId == null) return;
                          
                          setDialogState(() {
                            dialogLoading = true;
                            dialogError = null;
                          });
                          try {
                            await ApiService.createCourse(
                              courseCode: codeController.text.trim().toUpperCase(),
                              courseName: nameController.text.trim(),
                              lecturerId: selectedLecturerId!,
                            );
                            Navigator.pop(context);
                            _fetchCoursesOnly();
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              const SnackBar(content: Text("Course module created successfully.")),
                            );
                          } catch (e) {
                            setDialogState(() {
                              dialogLoading = false;
                              dialogError = e.toString().replaceAll('Exception:', '').trim();
                            });
                          }
                        },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF06B6D4), foregroundColor: const Color(0xFF0F172A)),
                  child: dialogLoading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0F172A)))
                      : const Text("Create"),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    const backgroundColor = Color(0xFF0F172A);
    const cardColor = Color(0xFF1E293B);
    const primaryColor = Color(0xFF06B6D4);
    const borderSlate = Color(0xFF334155);

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: cardColor,
        elevation: 0,
        title: const Text(
          "Course Modules",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            onPressed: _handleLogout,
            icon: const Icon(Icons.logout, color: Colors.redAccent, size: 20),
            tooltip: 'Sign Out',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddCourseDialog,
        backgroundColor: primaryColor,
        foregroundColor: backgroundColor,
        child: const Icon(Icons.bookmark_add),
      ),
      body: RefreshIndicator(
        onRefresh: _loadInitialData,
        color: primaryColor,
        backgroundColor: cardColor,
        child: Column(
          children: [
            // Search Input Header
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextFormField(
                controller: _searchController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  hintText: "Search courses by code, name or lecturer...",
                  hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B), size: 20),
                  filled: true,
                  fillColor: cardColor,
                  contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: borderSlate),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: borderSlate),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: primaryColor),
                  ),
                ),
              ),
            ),

            // Content Area
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: primaryColor))
                  : _errorMessage.isNotEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                            Center(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                                child: Column(
                                  children: [
                                    const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
                                    const SizedBox(height: 12),
                                    Text(
                                      _errorMessage,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(color: Colors.redAccent, fontSize: 14),
                                    ),
                                    const SizedBox(height: 12),
                                    ElevatedButton(
                                      onPressed: _loadInitialData,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: primaryColor,
                                        foregroundColor: backgroundColor,
                                      ),
                                      child: const Text("Retry"),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        )
                      : _filteredCourses.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                                const Center(
                                  child: Column(
                                    children: [
                                      Icon(Icons.book_outlined, color: Color(0xFF475569), size: 56),
                                      SizedBox(height: 12),
                                      Text(
                                        "No courses found",
                                        style: TextStyle(color: Color(0xFF64748B), fontSize: 14, fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.symmetric(horizontal: 16.0),
                              itemCount: _filteredCourses.length,
                              itemBuilder: (context, index) {
                                final course = _filteredCourses[index];
                                final code = course['course_code'] ?? 'N/A';
                                final name = course['course_name'] ?? 'Unknown Course';
                                final lecturer = course['lecturer'] ?? {};
                                final lecturerName = lecturer['fullname'] ?? 'Unassigned';

                                return Card(
                                  color: cardColor,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: const BorderSide(color: borderSlate, width: 1),
                                  ),
                                  margin: const EdgeInsets.only(bottom: 12.0),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Row(
                                      children: [
                                        CircleAvatar(
                                          backgroundColor: const Color(0xFF3B82F6).withOpacity(0.1),
                                          radius: 20,
                                          child: const Icon(Icons.book, color: Color(0xFF3B82F6), size: 20),
                                        ),
                                        const SizedBox(width: 16),

                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                code,
                                                style: const TextStyle(
                                                  color: primaryColor,
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 15,
                                                  fontFamily: 'monospace',
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                name,
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 14,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                "Instructor: $lecturerName",
                                                style: const TextStyle(
                                                  color: Color(0xFF64748B),
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }
}
