import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../login_screen.dart';

class StatsTab extends StatefulWidget {
  const StatsTab({super.key});

  @override
  State<StatsTab> createState() => _StatsTabState();
}

class _StatsTabState extends State<StatsTab> {
  List<Map<String, dynamic>> _courseStats = [];
  List<Map<String, dynamic>> _logs = [];
  List<Map<String, dynamic>> _filteredLogs = [];
  List<Map<String, dynamic>> _courses = [];
  
  bool _isLoading = true;
  String _errorMessage = '';
  
  final _searchController = TextEditingController();
  int? _selectedCourseFilter; // course_id

  // Aggregated Stats
  int _totalStudents = 0;
  int _presentToday = 0;
  double _averageRate = 0.0;

  @override
  void initState() {
    super.initState();
    _loadData();
    _searchController.addListener(_filterLogs);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });
    try {
      // Parallel fetch
      final results = await Future.wait([
        ApiService.getReportsStats(),
        ApiService.getAttendanceLogs(),
        ApiService.getCourses(),
      ]);

      final courseStatsData = List<Map<String, dynamic>>.from(results[0]);
      final logsData = List<Map<String, dynamic>>.from(results[1]);
      final coursesData = List<Map<String, dynamic>>.from(results[2]);

      _calculateAggregates(courseStatsData);

      setState(() {
        _courseStats = courseStatsData;
        _logs = logsData;
        _filteredLogs = logsData;
        _courses = coursesData;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception:', '').trim();
        _isLoading = false;
      });
    }
  }

  void _calculateAggregates(List<Map<String, dynamic>> statsList) {
    if (statsList.isEmpty) {
      _totalStudents = 0;
      _presentToday = 0;
      _averageRate = 0.0;
      return;
    }
    
    // Total students is the maximum of any course's total_students (since students are global)
    int maxStudents = 0;
    int sumPresent = 0;
    double sumRates = 0.0;

    for (var stat in statsList) {
      final total = stat['total_students'] as int? ?? 0;
      final present = stat['present_today'] as int? ?? 0;
      final rate = stat['attendance_rate'] as double? ?? 0.0;
      
      if (total > maxStudents) {
        maxStudents = total;
      }
      sumPresent += present;
      sumRates += rate;
    }

    _totalStudents = maxStudents;
    _presentToday = sumPresent;
    _averageRate = sumRates / statsList.length;
  }

  void _filterLogs() {
    final query = _searchController.text.toLowerCase().trim();
    setState(() {
      _filteredLogs = _logs.where((log) {
        // Search query filter
        final student = log['student'] ?? {};
        final user = student['user'] ?? {};
        final name = (user['fullname'] ?? '').toString().toLowerCase();
        final matric = (student['matric_number'] ?? '').toString().toLowerCase();
        final course = log['course'] ?? {};
        final courseCode = (course['course_code'] ?? '').toString().toLowerCase();

        final matchesSearch = name.contains(query) || matric.contains(query) || courseCode.contains(query);

        // Course dropdown filter
        final logCourseId = log['course_id'] as int?;
        final matchesCourse = _selectedCourseFilter == null || logCourseId == _selectedCourseFilter;

        return matchesSearch && matchesCourse;
      }).toList();
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
          "Dashboard Stats",
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
        onRefresh: _loadData,
        color: primaryColor,
        backgroundColor: cardColor,
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
                                onPressed: _loadData,
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
                : CustomScrollView(
                    slivers: [
                      // Stats Cards Summary Grid
                      SliverPadding(
                        padding: const EdgeInsets.all(16.0),
                        sliver: SliverGrid.count(
                          crossAxisCount: 3,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                          childAspectRatio: 0.85,
                          children: [
                            _buildStatMetricCard(
                              title: "Total Students",
                              value: _totalStudents.toString(),
                              icon: Icons.people_outline,
                              color: Colors.indigoAccent,
                            ),
                            _buildStatMetricCard(
                              title: "Present Today",
                              value: _presentToday.toString(),
                              icon: Icons.check_circle_outline,
                              color: const Color(0xFF10B981), // Emerald
                            ),
                            _buildStatMetricCard(
                              title: "Avg Rate",
                              value: "${_averageRate.toStringAsFixed(1)}%",
                              icon: Icons.percent,
                              color: primaryColor,
                            ),
                          ],
                        ),
                      ),

                      // Roster Header & Course Stats Carousel Title
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                          child: Text(
                            "COURSE STATS MODULES",
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ),

                      // Horizontal Course Stats Scroll View
                      SliverToBoxAdapter(
                        child: SizedBox(
                          height: 125,
                          child: _courseStats.isEmpty
                              ? const Center(
                                  child: Text("No courses module statistics available", style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                                )
                              : ListView.builder(
                                  scrollDirection: Axis.horizontal,
                                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                                  itemCount: _courseStats.length,
                                  itemBuilder: (context, index) {
                                    final stat = _courseStats[index];
                                    final code = stat['course_code'] ?? 'N/A';
                                    final name = stat['course_name'] ?? 'N/A';
                                    final present = stat['present_today'] as int? ?? 0;
                                    final rate = stat['attendance_rate'] as double? ?? 0.0;

                                    return Container(
                                      width: 170,
                                      margin: const EdgeInsets.only(right: 12.0, bottom: 8.0),
                                      padding: const EdgeInsets.all(12.0),
                                      decoration: BoxDecoration(
                                        color: cardColor,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: borderSlate),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.stretch,
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                code,
                                                style: const TextStyle(
                                                  color: primaryColor,
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 13,
                                                  fontFamily: 'monospace',
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                name,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                "Present: $present",
                                                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                              ),
                                              Text(
                                                "${rate.toStringAsFixed(0)}%",
                                                style: TextStyle(
                                                  color: rate >= 75 ? const Color(0xFF10B981) : Colors.orangeAccent,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 12,
                                                  fontFamily: 'monospace',
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ),

                      // Recent Logs Section Header & Filters
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 8.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    "RECENT ATTENDANCE LOGS",
                                    style: TextStyle(
                                      color: Color(0xFF94A3B8),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  Text(
                                    "${_filteredLogs.length} found",
                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              
                              // Search input
                              TextFormField(
                                controller: _searchController,
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                                decoration: InputDecoration(
                                  hintText: "Search by student name or matric...",
                                  hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                  prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B), size: 18),
                                  filled: true,
                                  fillColor: cardColor,
                                  contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: const BorderSide(color: borderSlate),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: const BorderSide(color: borderSlate),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: const BorderSide(color: primaryColor),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),

                              // Course Dropdown filter
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                decoration: BoxDecoration(
                                  color: cardColor,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: borderSlate),
                                ),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<int?>(
                                    value: _selectedCourseFilter,
                                    dropdownColor: cardColor,
                                    hint: const Text("All Courses Filter", style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                                    icon: const Icon(Icons.keyboard_arrow_down, color: primaryColor, size: 18),
                                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                    isExpanded: true,
                                    items: [
                                      const DropdownMenuItem<int?>(
                                        value: null,
                                        child: Text("Filter: All Course Modules"),
                                      ),
                                      ..._courses.map((course) {
                                        return DropdownMenuItem<int?>(
                                          value: course['id'] as int,
                                          child: Text("Filter: ${course['course_code']} - ${course['course_name']}"),
                                        );
                                      }).toList(),
                                    ],
                                    onChanged: (val) {
                                      setState(() {
                                        _selectedCourseFilter = val;
                                      });
                                      _filterLogs();
                                    },
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Recent Logs List
                      _filteredLogs.isEmpty
                          ? const SliverFillRemaining(
                              hasScrollBody: false,
                              child: Center(
                                child: Padding(
                                  padding: EdgeInsets.symmetric(vertical: 32.0),
                                  child: Column(
                                    children: [
                                      Icon(Icons.history, color: Color(0xFF475569), size: 40),
                                      SizedBox(height: 8),
                                      Text(
                                        "No logs match filters",
                                        style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            )
                          : SliverList(
                              delegate: SliverChildBuilderDelegate(
                                (context, index) {
                                  final log = _filteredLogs[index];
                                  final student = log['student'] ?? {};
                                  final user = student['user'] ?? {};
                                  final name = user['fullname'] ?? 'Unknown Student';
                                  final matric = student['matric_number'] ?? 'N/A';
                                  final course = log['course'] ?? {};
                                  final courseCode = course['course_code'] ?? 'N/A';
                                  final timeStr = log['attendance_time'] ?? '';
                                  final status = log['status'] ?? 'Present';
                                  final confidence = log['confidence_score'] as double?;

                                  Color statusColor = const Color(0xFF10B981);
                                  if (status.toString().toLowerCase() == 'late') {
                                    statusColor = const Color(0xFFD4AF37);
                                  } else if (status.toString().toLowerCase() == 'absent') {
                                    statusColor = const Color(0xFFEF4444);
                                  }

                                  return Container(
                                    margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 6.0),
                                    padding: const EdgeInsets.all(12.0),
                                    decoration: BoxDecoration(
                                      color: cardColor,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: borderSlate),
                                    ),
                                    child: Row(
                                      children: [
                                        // Colored avatar with first letter of name
                                        CircleAvatar(
                                          backgroundColor: statusColor.withOpacity(0.1),
                                          radius: 18,
                                          child: Text(
                                            name.isNotEmpty ? name[0].toUpperCase() : 'S',
                                            style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        
                                        // Student details
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                name,
                                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                              ),
                                              const SizedBox(height: 2),
                                              Row(
                                                children: [
                                                  Text(
                                                    matric,
                                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontFamily: 'monospace'),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Text(
                                                    "•  $courseCode",
                                                    style: const TextStyle(color: primaryColor, fontSize: 11, fontWeight: FontWeight.w600),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        
                                        // Status and time
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Text(
                                              _formatDateTime(timeStr),
                                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, fontFamily: 'monospace'),
                                            ),
                                            const SizedBox(height: 4),
                                            Row(
                                              children: [
                                                if (confidence != null) ...[
                                                  Text(
                                                    "${(confidence * 100).toStringAsFixed(0)}% match",
                                                    style: const TextStyle(color: Color(0xFF475569), fontSize: 9, fontFamily: 'monospace'),
                                                  ),
                                                  const SizedBox(width: 6),
                                                ],
                                                Text(
                                                  status,
                                                  style: TextStyle(
                                                    color: statusColor,
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 11,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  );
                                },
                                childCount: _filteredLogs.length,
                              ),
                            ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildStatMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    const cardColor = Color(0xFF1C2541);
    const borderSlate = Color(0xFF2A344E);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderSlate),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 16,
              letterSpacing: -0.5,
              fontFamily: 'monospace',
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 9,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
