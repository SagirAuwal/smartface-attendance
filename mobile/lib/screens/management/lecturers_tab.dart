import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../login_screen.dart';

class LecturersTab extends StatefulWidget {
  const LecturersTab({super.key});

  @override
  State<LecturersTab> createState() => _LecturersTabState();
}

class _LecturersTabState extends State<LecturersTab> {
  List<Map<String, dynamic>> _lecturers = [];
  List<Map<String, dynamic>> _filteredLecturers = [];
  bool _isLoading = true;
  String _errorMessage = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchLecturers();
    _searchController.addListener(_filterLecturers);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchLecturers() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });
    try {
      final lecturers = await ApiService.getLecturers();
      setState(() {
        _lecturers = lecturers;
        _filteredLecturers = lecturers;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception:', '').trim();
        _isLoading = false;
      });
    }
  }

  void _filterLecturers() {
    final query = _searchController.text.toLowerCase().trim();
    setState(() {
      if (query.isEmpty) {
        _filteredLecturers = _lecturers;
      } else {
        _filteredLecturers = _lecturers.where((lecturer) {
          final name = (lecturer['fullname'] ?? '').toString().toLowerCase();
          final email = (lecturer['email'] ?? '').toString().toLowerCase();
          final dept = (lecturer['department'] ?? '').toString().toLowerCase();
          return name.contains(query) || email.contains(query) || dept.contains(query);
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

  void _showAddLecturerDialog() {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final deptController = TextEditingController();
    final courseCodeController = TextEditingController();
    final courseNameController = TextEditingController();
    final pwdController = TextEditingController();

    bool dialogLoading = false;
    String? dialogError;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1C2541),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFF2A344E)),
              ),
              title: const Row(
                children: [
                  Icon(Icons.person_add_alt_1, color: Color(0xFFD4AF37)),
                  SizedBox(width: 10),
                  Text("Add New Lecturer", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
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
                        controller: nameController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Full Name", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.isEmpty ? "Full name is required" : null,
                      ),
                      TextFormField(
                        controller: emailController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Email Address", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.isEmpty ? "Email is required" : null,
                      ),
                      TextFormField(
                        controller: deptController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Department", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.isEmpty ? "Department is required" : null,
                      ),
                      TextFormField(
                        controller: courseCodeController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Course Code (e.g. CSC301)", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.isEmpty ? "Course code is required" : null,
                      ),
                      TextFormField(
                        controller: courseNameController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Course Name (e.g. Software Eng)", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.isEmpty ? "Course name is required" : null,
                      ),
                      TextFormField(
                        controller: pwdController,
                        obscureText: true,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Password", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.length < 4 ? "Password must be at least 4 chars" : null,
                      ),
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
                          setDialogState(() {
                            dialogLoading = true;
                            dialogError = null;
                          });
                          try {
                            await ApiService.createLecturer(
                              fullname: nameController.text.trim(),
                              email: emailController.text.trim(),
                              department: deptController.text.trim(),
                              courseCode: courseCodeController.text.trim().toUpperCase(),
                              courseName: courseNameController.text.trim(),
                              password: pwdController.text,
                            );
                            Navigator.pop(context);
                            _fetchLecturers();
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              const SnackBar(content: Text("Lecturer and course created successfully.")),
                            );
                          } catch (e) {
                            setDialogState(() {
                              dialogLoading = false;
                              dialogError = e.toString().replaceAll('Exception:', '').trim();
                            });
                          }
                        },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD4AF37), foregroundColor: const Color(0xFF0B132B)),
                  child: dialogLoading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0B132B)))
                      : const Text("Create"),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showDeleteConfirmDialog(int id, String name) {
    showDialog(
      context: context,
      builder: (context) {
        bool dialogLoading = false;
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1C2541),
              title: const Text("Delete Lecturer Profile?", style: TextStyle(color: Colors.white)),
              content: Text("Are you absolutely sure you want to delete the lecturer profile for '$name'? This action will also delete all course modules they teach, and attendance records associated with their courses.",
                  style: const TextStyle(color: Color(0xFF94A3B8))),
              actions: [
                TextButton(
                  onPressed: dialogLoading ? null : () => Navigator.pop(context),
                  child: const Text("Cancel", style: TextStyle(color: Color(0xFF64748B))),
                ),
                TextButton(
                  onPressed: dialogLoading
                      ? null
                      : () async {
                          setDialogState(() {
                            dialogLoading = true;
                          });
                          try {
                            await ApiService.deleteLecturer(id);
                            Navigator.pop(context);
                            _fetchLecturers();
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              const SnackBar(content: Text("Lecturer profile deleted successfully.")),
                            );
                          } catch (e) {
                            setDialogState(() {
                              dialogLoading = false;
                            });
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              SnackBar(content: Text(e.toString())),
                            );
                          }
                        },
                  child: dialogLoading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.redAccent))
                      : const Text("Delete", style: TextStyle(color: Colors.redAccent)),
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
    const backgroundColor = Color(0xFF0B132B);
    const cardColor = Color(0xFF1C2541);
    const primaryColor = Color(0xFFD4AF37);
    const borderSlate = Color(0xFF2A344E);

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: cardColor,
        elevation: 0,
        title: const Text(
          "Manage Lecturers",
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
        onPressed: _showAddLecturerDialog,
        backgroundColor: primaryColor,
        foregroundColor: backgroundColor,
        child: const Icon(Icons.person_add_alt_1_sharp),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchLecturers,
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
                  hintText: "Search lecturers by name, email or department...",
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
                                      onPressed: _fetchLecturers,
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
                      : _filteredLecturers.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                                const Center(
                                  child: Column(
                                    children: [
                                      Icon(Icons.assignment_ind_outlined, color: Color(0xFF475569), size: 56),
                                      SizedBox(height: 12),
                                      Text(
                                        "No lecturer accounts found",
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
                              itemCount: _filteredLecturers.length,
                              itemBuilder: (context, index) {
                                final lecturer = _filteredLecturers[index];
                                final id = lecturer['id'] as int;
                                final name = lecturer['fullname'] ?? 'Lecturer';
                                final email = lecturer['email'] ?? 'No Email';
                                final dept = lecturer['department'] ?? 'N/A';

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
                                          backgroundColor: primaryColor.withOpacity(0.1),
                                          radius: 20,
                                          child: Text(
                                            name.isNotEmpty ? name[0].toUpperCase() : 'L',
                                            style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 16),
                                          ),
                                        ),
                                        const SizedBox(width: 16),

                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                name,
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 14.5,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                email,
                                                style: const TextStyle(
                                                  color: Color(0xFF94A3B8),
                                                  fontSize: 12,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                "Department: $dept",
                                                style: const TextStyle(
                                                  color: Color(0xFF64748B),
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),

                                        IconButton(
                                          onPressed: () => _showDeleteConfirmDialog(id, name),
                                          icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 22),
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
