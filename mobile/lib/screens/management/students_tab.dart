import 'package:flutter/material.dart';
import 'dart:typed_data';
import '../../services/api_service.dart';
import '../login_screen.dart';
import 'face_capture_screen.dart';

class StudentsTab extends StatefulWidget {
  const StudentsTab({super.key});

  @override
  State<StudentsTab> createState() => _StudentsTabState();
}

class _StudentsTabState extends State<StudentsTab> {
  List<Map<String, dynamic>> _students = [];
  List<Map<String, dynamic>> _filteredStudents = [];
  bool _isLoading = true;
  String _errorMessage = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchStudents();
    _searchController.addListener(_filterStudents);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchStudents() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });
    try {
      final students = await ApiService.getStudents();
      setState(() {
        _students = students;
        _filteredStudents = students;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception:', '').trim();
        _isLoading = false;
      });
    }
  }

  void _filterStudents() {
    final query = _searchController.text.toLowerCase().trim();
    setState(() {
      if (query.isEmpty) {
        _filteredStudents = _students;
      } else {
        _filteredStudents = _students.where((student) {
          final user = student['user'] ?? {};
          final name = (user['fullname'] ?? '').toString().toLowerCase();
          final email = (user['email'] ?? '').toString().toLowerCase();
          final matric = (student['matric_number'] ?? '').toString().toLowerCase();
          final dept = (student['department'] ?? '').toString().toLowerCase();
          return name.contains(query) || email.contains(query) || matric.contains(query) || dept.contains(query);
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

  void _showAddStudentDialog() {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final matricController = TextEditingController();
    final deptController = TextEditingController();
    final levelController = TextEditingController();
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
              backgroundColor: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFF334155)),
              ),
              title: const Row(
                children: [
                  Icon(Icons.person_add_alt_1, color: Color(0xFF06B6D4)),
                  SizedBox(width: 10),
                  Text("Add New Student", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
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
                        controller: matricController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Matriculation Number", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.isEmpty ? "Matric number is required" : null,
                      ),
                      TextFormField(
                        controller: deptController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Department", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        validator: (v) => v == null || v.isEmpty ? "Department is required" : null,
                      ),
                      DropdownButtonFormField<String>(
                        dropdownColor: const Color(0xFF1E293B),
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(labelText: "Level", labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                        items: ['100', '200', '300', '400', '500'].map((l) {
                          return DropdownMenuItem(value: l, child: Text("$l Level"));
                        }).toList(),
                        onChanged: (val) => levelController.text = val ?? '',
                        validator: (v) => v == null || v.isEmpty ? "Level is required" : null,
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
                  child: const Text("Cancel", style: TextStyle(color: Color(0xFF94A3B8))),
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
                            await ApiService.createStudent(
                              fullname: nameController.text.trim(),
                              email: emailController.text.trim(),
                              matricNumber: matricController.text.trim(),
                              department: deptController.text.trim(),
                              level: levelController.text,
                              password: pwdController.text,
                            );
                            Navigator.pop(context);
                            _fetchStudents();
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              const SnackBar(content: Text("Student profile created successfully.")),
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

  void _showStudentActionsDialog(Map<String, dynamic> student) {
    final user = student['user'] ?? {};
    final id = student['student_id'] as int;
    final name = user['fullname'] ?? 'Student';
    final matric = student['matric_number'] ?? 'N/A';
    
    bool dialogLoading = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFF334155)),
              ),
              title: Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text("Matric No: $matric", style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'monospace', fontSize: 13)),
                  const SizedBox(height: 4),
                  Text("Dept: ${student['department']}", style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  Text("Level: ${student['level']} Level", style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  const SizedBox(height: 20),
                  
                  // Action 1: Enroll Face
                  ElevatedButton.icon(
                    onPressed: dialogLoading
                        ? null
                        : () async {
                            Navigator.pop(context); // Close actions dialog
                            _enrollFaceFlow(id, name);
                          },
                    icon: const Icon(Icons.face, size: 20),
                    label: const Text("Enroll Face Biometrics"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF06B6D4),
                      foregroundColor: const Color(0xFF0F172A),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  
                  // Action 2: Delete student profile
                  ElevatedButton.icon(
                    onPressed: dialogLoading
                        ? null
                        : () async {
                            final confirm = await _showDeleteConfirmDialog(name);
                            if (confirm == true) {
                              setDialogState(() {
                                dialogLoading = true;
                              });
                              try {
                                await ApiService.deleteStudent(id);
                                Navigator.pop(context); // Close dialog
                                _fetchStudents();
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  const SnackBar(content: Text("Student profile and records deleted.")),
                                );
                              } catch (e) {
                                setDialogState(() {
                                  dialogLoading = false;
                                });
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  SnackBar(content: Text(e.toString())),
                                );
                              }
                            }
                          },
                    icon: const Icon(Icons.delete_forever, size: 20),
                    label: const Text("Delete Account"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.redAccent.withOpacity(0.15),
                      foregroundColor: Colors.redAccent,
                      side: const BorderSide(color: Colors.redAccent, width: 1),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _enrollFaceFlow(int studentId, String studentName) async {
    // Navigate to camera capture view
    final Uint8List? imageBytes = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const FaceCaptureScreen()),
    );

    if (imageBytes == null) return; // User cancelled

    // Start showing a spinner overlay on students tab
    setState(() {
      _isLoading = true;
    });

    try {
      final result = await ApiService.registerStudentFace(
        studentId: studentId,
        imageBytes: imageBytes,
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF10B981), // Emerald
          content: Text(result['message'] ?? "Face registered successfully!"),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFEF4444), // Red
          content: Text(e.toString().replaceAll('Exception:', '').trim()),
        ),
      );
    } finally {
      _fetchStudents(); // Refresh lists
    }
  }

  Future<bool?> _showDeleteConfirmDialog(String name) {
    return showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Text("Confirm Deletion", style: TextStyle(color: Colors.white)),
          content: Text("Are you absolutely sure you want to delete the student profile for '$name'? This action deletes all their face biometrics and attendance records irreversibly.",
              style: const TextStyle(color: Color(0xFF94A3B8))),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text("Cancel", style: TextStyle(color: Color(0xFF64748B))),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text("Delete", style: TextStyle(color: Colors.redAccent)),
            ),
          ],
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
          "Manage Students",
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
        onPressed: _showAddStudentDialog,
        backgroundColor: primaryColor,
        foregroundColor: backgroundColor,
        child: const Icon(Icons.person_add_alt_1_sharp),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchStudents,
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
                  hintText: "Search students by name, email or matric...",
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
                                      onPressed: _fetchStudents,
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
                      : _filteredStudents.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                                const Center(
                                  child: Column(
                                    children: [
                                      Icon(Icons.people_outline_sharp, color: Color(0xFF475569), size: 56),
                                      SizedBox(height: 12),
                                      Text(
                                        "No student accounts found",
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
                              itemCount: _filteredStudents.length,
                              itemBuilder: (context, index) {
                                final student = _filteredStudents[index];
                                final user = student['user'] ?? {};
                                final name = user['fullname'] ?? 'Student';
                                final matric = student['matric_number'] ?? 'N/A';
                                final dept = student['department'] ?? 'N/A';
                                final level = student['level'] ?? 'N/A';
                                
                                // Check if student has registered face embeddings
                                // If they do, we can show a verified icon, else show a warning/unverified icon
                                final hasFace = student['has_embeddings'] ?? false; // Back-compatibility check
                                final embeddingsList = student['embeddings'] as List?;
                                final isEnrolled = hasFace || (embeddingsList != null && embeddingsList.isNotEmpty);

                                return Card(
                                  color: cardColor,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: const BorderSide(color: borderSlate, width: 1),
                                  ),
                                  margin: const EdgeInsets.only(bottom: 12.0),
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(12),
                                    onTap: () => _showStudentActionsDialog(student),
                                    child: Padding(
                                      padding: const EdgeInsets.all(16.0),
                                      child: Row(
                                        children: [
                                          // Biometric verification indicator avatar
                                          CircleAvatar(
                                            backgroundColor: isEnrolled
                                                ? const Color(0xFF10B981).withOpacity(0.1) // Green
                                                : Colors.amber.withOpacity(0.1), // Yellow warning
                                            radius: 20,
                                            child: Icon(
                                              isEnrolled ? Icons.face : Icons.face_retouching_off,
                                              color: isEnrolled ? const Color(0xFF10B981) : Colors.amber,
                                              size: 22,
                                            ),
                                          ),
                                          const SizedBox(width: 16),

                                          // Student Details Text
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
                                                  "Matric No: $matric",
                                                  style: const TextStyle(
                                                    color: Color(0xFF94A3B8),
                                                    fontSize: 12.5,
                                                    fontFamily: 'monospace',
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  "$dept • $level Level",
                                                  style: const TextStyle(
                                                    color: Color(0xFF64748B),
                                                    fontSize: 11.5,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),

                                          const Icon(Icons.arrow_forward_ios, color: Color(0xFF475569), size: 14),
                                        ],
                                      ),
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
