import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../login_screen.dart';

class MyAttendanceTab extends StatefulWidget {
  const MyAttendanceTab({super.key});

  @override
  State<MyAttendanceTab> createState() => _MyAttendanceTabState();
}

class _MyAttendanceTabState extends State<MyAttendanceTab> {
  List<Map<String, dynamic>> _logs = [];
  List<Map<String, dynamic>> _filteredLogs = [];
  bool _isLoading = true;
  String _errorMessage = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchLogs();
    _searchController.addListener(_filterLogs);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchLogs() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });
    try {
      final logs = await ApiService.getAttendanceLogs();
      setState(() {
        _logs = logs;
        _filteredLogs = logs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception:', '').trim();
        _isLoading = false;
      });
    }
  }

  void _filterLogs() {
    final query = _searchController.text.toLowerCase().trim();
    setState(() {
      if (query.isEmpty) {
        _filteredLogs = _logs;
      } else {
        _filteredLogs = _logs.where((log) {
          final course = log['course'] ?? {};
          final courseCode = (course['course_code'] ?? '').toString().toLowerCase();
          final courseName = (course['course_name'] ?? '').toString().toLowerCase();
          final status = (log['status'] ?? '').toString().toLowerCase();
          return courseCode.contains(query) ||
              courseName.contains(query) ||
              status.contains(query);
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

  String _formatDateTime(String dateStr) {
    try {
      final dateTime = DateTime.parse(dateStr).toLocal();
      return "${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}";
    } catch (_) {
      return dateStr;
    }
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
          "My Attendance",
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
      body: RefreshIndicator(
        onRefresh: _fetchLogs,
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
                  hintText: "Search course or status...",
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
                                      onPressed: _fetchLogs,
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
                      : _filteredLogs.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                                const Center(
                                  child: Column(
                                    children: [
                                      Icon(Icons.history, color: Color(0xFF475569), size: 56),
                                      SizedBox(height: 12),
                                      Text(
                                        "No attendance logs found",
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
                              itemCount: _filteredLogs.length,
                              itemBuilder: (context, index) {
                                final log = _filteredLogs[index];
                                final course = log['course'] ?? {};
                                final courseCode = course['course_code'] ?? 'N/A';
                                final courseName = course['course_name'] ?? 'Unknown Course';
                                final status = log['status'] ?? 'Present';
                                final timeStr = log['attendance_time'] ?? '';
                                final confidence = log['confidence_score'] as double?;

                                Color statusColor = const Color(0xFF10B981); // emerald for Present
                                if (status.toString().toLowerCase() == 'late') {
                                  statusColor = const Color(0xFFD4AF37); // gold
                                } else if (status.toString().toLowerCase() == 'absent') {
                                  statusColor = const Color(0xFFEF4444); // red
                                }

                                return Card(
                                  color: cardColor,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: const BorderSide(color: borderSlate, width: 1),
                                  ),
                                  margin: const EdgeInsets.only(bottom: 12.0),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                courseCode,
                                                style: const TextStyle(
                                                  color: primaryColor,
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 16,
                                                  fontFamily: 'monospace',
                                                ),
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: statusColor.withOpacity(0.15),
                                                border: Border.all(color: statusColor.withOpacity(0.4)),
                                                borderRadius: BorderRadius.circular(20),
                                              ),
                                              child: Text(
                                                status,
                                                style: TextStyle(
                                                  color: statusColor,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          courseName,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        const Divider(color: borderSlate, height: 1),
                                        const SizedBox(height: 12),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              _formatDateTime(timeStr),
                                              style: const TextStyle(
                                                color: Color(0xFF94A3B8),
                                                fontSize: 12,
                                                fontFamily: 'monospace',
                                              ),
                                            ),
                                            if (confidence != null)
                                              Text(
                                                "Confidence: ${(confidence * 100).toStringAsFixed(1)}%",
                                                style: const TextStyle(
                                                  color: Color(0xFF64748B),
                                                  fontSize: 11,
                                                  fontFamily: 'monospace',
                                                ),
                                              ),
                                          ],
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
