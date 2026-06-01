import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'scanner_screen.dart';
import 'management/stats_tab.dart';
import 'management/students_tab.dart';
import 'management/lecturers_tab.dart';
import 'management/courses_tab.dart';
import 'management/my_attendance_tab.dart';

class HomeContainerScreen extends StatefulWidget {
  const HomeContainerScreen({super.key});

  @override
  State<HomeContainerScreen> createState() => _HomeContainerScreenState();
}

class _HomeContainerScreenState extends State<HomeContainerScreen> {
  int _currentIndex = 0;
  bool _isLoading = true;
  Map<String, dynamic>? _currentUser;
  List<Widget> _screens = [];
  List<BottomNavigationBarItem> _navItems = [];

  @override
  void initState() {
    super.initState();
    _loadUserAndTabs();
  }

  Future<void> _loadUserAndTabs() async {
    try {
      final user = await ApiService.getCurrentUser();
      if (user == null) {
        _navigateToLogin();
        return;
      }

      setState(() {
        _currentUser = user;
        final role = user['role'] ?? 'student';

        if (role == 'admin') {
          _screens = [
            // Scanner Screen (only active when it's index 0)
            ScannerScreen(active: _currentIndex == 0),
            const StatsTab(),
            const StudentsTab(),
            const LecturersTab(),
            const CoursesTab(),
          ];
          _navItems = const [
            BottomNavigationBarItem(
              icon: Icon(Icons.qr_code_scanner),
              label: 'Scanner',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard),
              label: 'Stats',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.people),
              label: 'Students',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.assignment_ind),
              label: 'Lecturers',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.book),
              label: 'Courses',
            ),
          ];
        } else if (role == 'lecturer') {
          _screens = [
            ScannerScreen(active: _currentIndex == 0),
            const StatsTab(),
            const StudentsTab(),
            const CoursesTab(),
          ];
          _navItems = const [
            BottomNavigationBarItem(
              icon: Icon(Icons.qr_code_scanner),
              label: 'Scanner',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard),
              label: 'Stats',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.people),
              label: 'Students',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.book),
              label: 'Courses',
            ),
          ];
        } else {
          // student
          _screens = [
            const MyAttendanceTab(),
          ];
          _navItems = const [
            BottomNavigationBarItem(
              icon: Icon(Icons.history),
              label: 'My Attendance',
            ),
          ];
        }
        _isLoading = false;
      });
    } catch (_) {
      _navigateToLogin();
    }
  }

  void _navigateToLogin() {
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  // Helper method to rebuild tabs with the correct active status for the Scanner
  void _updateActiveTab(int index) {
    setState(() {
      _currentIndex = index;
      final role = _currentUser?['role'] ?? 'student';
      if (role == 'admin') {
        _screens[0] = ScannerScreen(active: _currentIndex == 0);
      } else if (role == 'lecturer') {
        _screens[0] = ScannerScreen(active: _currentIndex == 0);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body: Center(
          child: CircularProgressIndicator(
            color: Color(0xFF06B6D4),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: _screens.length <= 1
          ? null // No navigation bar needed if only one tab exists
          : Container(
              decoration: const BoxDecoration(
                border: Border(
                  top: BorderSide(color: Color(0xFF334155), width: 1),
                ),
              ),
              child: BottomNavigationBar(
                currentIndex: _currentIndex,
                onTap: _updateActiveTab,
                backgroundColor: const Color(0xFF1E293B),
                selectedItemColor: const Color(0xFF06B6D4),
                unselectedItemColor: const Color(0xFF64748B),
                type: BottomNavigationBarType.fixed,
                selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                unselectedLabelStyle: const TextStyle(fontSize: 11),
                items: _navItems,
              ),
            ),
    );
  }
}
