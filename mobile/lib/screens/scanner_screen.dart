import 'package:flutter/material.dart';
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class ScannerScreen extends StatefulWidget {
  final bool active;
  const ScannerScreen({super.key, this.active = true});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with SingleTickerProviderStateMixin {
  List<CameraDescription> _cameras = [];
  CameraController? _cameraController;
  bool _cameraInitialized = false;
  CameraLensDirection _currentLensDirection = CameraLensDirection.front;
  
  // Roster and active options
  List<Map<String, dynamic>> _courses = [];
  int? _selectedCourseId;
  
  bool _loadingCourses = true;
  bool _processingScan = false;
  
  // Scanning feedback state
  String? _statusMessage;
  String? _matchedStudentName;
  String? _matchedMatric;
  double? _confidence;
  String _scanResultType = 'idle'; // success, duplicate, error, idle
  
  // Animation for scanner laser line
  late AnimationController _animationController;
  late Animation<double> _scannerAnimation;

  @override
  void initState() {
    super.initState();
    if (widget.active) {
      _requestCameraPermission();
    }
    _fetchCourses();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _scannerAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  Future<void> _requestCameraPermission() async {
    final status = await Permission.camera.request();
    if (status.isGranted) {
      _initializeCamera();
    } else {
      setState(() {
        _statusMessage = "Camera permission is required to mark attendance.";
        _scanResultType = "error";
      });
    }
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        setState(() {
          _statusMessage = "No camera devices found on this device.";
          _scanResultType = "error";
        });
        return;
      }
      
      // Try to select camera matching the current lens direction
      CameraDescription selectedCamera = _cameras.first;
      bool foundMatchingLens = false;
      for (var camera in _cameras) {
        if (camera.lensDirection == _currentLensDirection) {
          selectedCamera = camera;
          foundMatchingLens = true;
          break;
        }
      }
      
      if (!foundMatchingLens) {
        selectedCamera = _cameras.first;
        _currentLensDirection = selectedCamera.lensDirection;
      }

      if (_cameraController != null) {
        await _cameraController!.dispose();
      }

      _cameraController = CameraController(
        selectedCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _cameraController!.initialize();
      if (mounted) {
        setState(() {
          _cameraInitialized = true;
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = "Camera hardware setup failed: $e";
        _scanResultType = "error";
      });
    }
  }

  Future<void> _toggleCamera() async {
    if (_cameras.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No alternative camera lens available.')),
      );
      return;
    }
    
    setState(() {
      _cameraInitialized = false;
    });
    
    if (_currentLensDirection == CameraLensDirection.front) {
      _currentLensDirection = CameraLensDirection.back;
    } else {
      _currentLensDirection = CameraLensDirection.front;
    }
    
    await _initializeCamera();
  }

  Future<void> _fetchCourses() async {
    try {
      final coursesData = await ApiService.getCourses();
      setState(() {
        _courses = coursesData;
        if (coursesData.isNotEmpty) {
          _selectedCourseId = coursesData.first['id'] as int;
        }
      });
    } catch (e) {
      setState(() {
        _statusMessage = "Failed to load courses list from server.";
        _scanResultType = "error";
      });
    } finally {
      setState(() {
        _loadingCourses = false;
      });
    }
  }

  Future<void> _handleScanFace() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;
    if (_selectedCourseId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a course module first.')),
      );
      return;
    }

    setState(() {
      _processingScan = true;
      _statusMessage = "Capturing facial frame...";
      _scanResultType = "idle";
      _matchedStudentName = null;
      _matchedMatric = null;
      _confidence = null;
    });

    try {
      // 1. Capture camera frame image
      final XFile imageFile = await _cameraController!.takePicture();
      final Uint8List imageBytes = await imageFile.readAsBytes();

      setState(() {
        _statusMessage = "Analyzing biometrics...";
      });

      // 2. Send image payload bytes to backend
      final result = await ApiService.markAttendance(
        courseId: _selectedCourseId!,
        imageBytes: imageBytes,
      );

      final String status = result['status'] ?? 'error';

      setState(() {
        _scanResultType = status;
        if (status == 'success') {
          _statusMessage = "Attendance marked successfully!";
          _matchedStudentName = result['student']['user']['fullname'];
          _matchedMatric = result['student']['matric_number'];
          _confidence = result['confidence'];
        } else if (status == 'duplicate') {
          _statusMessage = "Duplicate: Already checked-in today.";
          _matchedStudentName = result['student']['user']['fullname'];
          _matchedMatric = result['student']['matric_number'];
          _confidence = result['confidence'];
        } else {
          _statusMessage = result['message'] ?? "Face not recognized. Scan rejected.";
          _matchedStudentName = null;
          _matchedMatric = null;
          _confidence = null;
        }
      });
    } catch (e) {
      setState(() {
        _scanResultType = "error";
        _statusMessage = e.toString().replaceAll('Exception:', '').trim();
      });
    } finally {
      setState(() {
        _processingScan = false;
      });
    }
  }

  Future<void> _handleLogout() async {
    await ApiService.logout();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  void didUpdateWidget(covariant ScannerScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active != oldWidget.active) {
      if (widget.active) {
        _requestCameraPermission();
      } else {
        _cameraController?.dispose();
        _cameraController = null;
        setState(() {
          _cameraInitialized = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _animationController.dispose();
    super.dispose();
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
          "Biometric Scanner",
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _handleLogout,
            icon: const Icon(Icons.logout, color: Colors.redAccent, size: 20),
            tooltip: 'Sign Out',
          ),
        ],
      ),
      body: _loadingCourses
          ? const Center(
              child: CircularProgressIndicator(color: primaryColor),
            )
          : LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Course Dropdown Selector Card
                      Card(
                        color: cardColor,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: borderSlate, width: 1),
                        ),
                        elevation: 4,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text(
                                "COURSE MODULE BLOCK",
                                style: TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 6),
                              _courses.isEmpty
                                  ? const Text(
                                      "No courses registered under your profile",
                                      style: TextStyle(color: Colors.redAccent, fontSize: 13),
                                    )
                                  : DropdownButtonHideUnderline(
                                      child: DropdownButton<int>(
                                        value: _selectedCourseId,
                                        dropdownColor: cardColor,
                                        icon: const Icon(Icons.keyboard_arrow_down, color: primaryColor),
                                        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                                        isExpanded: true,
                                        items: _courses.map((course) {
                                          return DropdownMenuItem<int>(
                                            value: course['id'] as int,
                                            child: Text("${course['course_code']} - ${course['course_name']}"),
                                          );
                                        }).toList(),
                                        onChanged: (val) {
                                          setState(() {
                                            _selectedCourseId = val;
                                          });
                                        },
                                      ),
                                    ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Viewfinder Camera frame
                      AspectRatio(
                        aspectRatio: 4 / 3,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: borderSlate, width: 1),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              if (_cameraInitialized && _cameraController != null)
                                CameraPreview(_cameraController!)
                              else
                                const Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                        const Icon(Icons.videocam_off_outlined, color: Color(0xFF475569), size: 48),
                                        const SizedBox(height: 8),
                                        const Text(
                                          "Camera Access Blocked",
                                          style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                        ),
                                    ],
                                  ),
                                ),

                              // Scanning Circular Frame Overlay & Laser Line
                              if (_cameraInitialized && !_processingScan && _scanResultType == 'idle')
                                AnimatedBuilder(
                                  animation: _scannerAnimation,
                                  builder: (context, child) {
                                    return CustomPaint(
                                      painter: ScannerOverlayPainter(
                                        progress: _scannerAnimation.value,
                                        laserColor: primaryColor,
                                      ),
                                    );
                                  },
                                ),
                              
                              // Camera Switch Toggle Button Overlay (Glassmorphic design)
                              if (_cameraInitialized && _cameras.length > 1 && !_processingScan)
                                Positioned(
                                  top: 16,
                                  right: 16,
                                  child: Material(
                                    color: Colors.black.withOpacity(0.5),
                                    borderRadius: BorderRadius.circular(12),
                                    child: InkWell(
                                      borderRadius: BorderRadius.circular(12),
                                      onTap: _toggleCamera,
                                      child: Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          border: Border.all(
                                            color: Colors.white.withOpacity(0.2),
                                            width: 1,
                                          ),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Icon(
                                          _currentLensDirection == CameraLensDirection.front
                                              ? Icons.camera_rear
                                              : Icons.camera_front,
                                          color: primaryColor,
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              
                              if (_processingScan)
                                Container(
                                  color: Colors.black.withOpacity(0.5),
                                  child: const Center(
                                    child: CircularProgressIndicator(color: primaryColor),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Results display card
                      if (_statusMessage != null || _scanResultType != 'idle')
                        _buildScanResultWidget(),
                      
                      const SizedBox(height: 24),

                      // Scanning Action Trigger Button
                      ElevatedButton(
                        onPressed: (_processingScan || !_cameraInitialized) ? null : _handleScanFace,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          foregroundColor: const Color(0xFF0B132B),
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 4,
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.face_retouching_natural, size: 22),
                            SizedBox(width: 10),
                            Text(
                              "SCAN FACE & MARK ATTENDANCE",
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  Widget _buildScanResultWidget() {
    Color cardBorderColor;
    Color textColor;
    IconData icon;
    
    switch (_scanResultType) {
      case 'success':
        cardBorderColor = const Color(0xFF10B981); // Emerald
        textColor = const Color(0xFF10B981);
        icon = Icons.check_circle_outline;
        break;
      case 'duplicate':
        cardBorderColor = const Color(0xFFD4AF37); // Gold
        textColor = const Color(0xFFD4AF37);
        icon = Icons.info_outline;
        break;
      case 'error':
        cardBorderColor = const Color(0xFFEF4444); // Red
        textColor = const Color(0xFFEF4444);
        icon = Icons.error_outline;
        break;
      default:
        cardBorderColor = const Color(0xFF2A344E);
        textColor = Colors.white;
        icon = Icons.info_outline;
    }

    return Card(
      color: const Color(0xFF1C2541),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: cardBorderColor.withOpacity(0.4), width: 1.5),
      ),
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(icon, color: textColor, size: 24),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _statusMessage ?? '',
                    style: TextStyle(
                      color: textColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
            
            if (_matchedStudentName != null) ...[
              const SizedBox(height: 12),
              const Divider(color: Color(0xFF2A344E), height: 1),
              const SizedBox(height: 12),
              
              Text(
                "Student: $_matchedStudentName",
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                "Matric No: $_matchedMatric",
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                  fontFamily: 'monospace',
                ),
              ),
              if (_confidence != null) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Text(
                      "Biometric Match Score: ",
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                    ),
                    Text(
                      "${(_confidence! * 100).toStringAsFixed(1)}%",
                      style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}


// Painter for drawing scan alignment visual guides and a laser animation line
class ScannerOverlayPainter extends CustomPainter {
  final double progress;
  final Color laserColor;

  ScannerOverlayPainter({
    required this.progress,
    required this.laserColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.2)
      ..style = PaintingStyle.fill;
      
    // Center bounding box size
    final rectWidth = size.width * 0.5;
    final rectHeight = size.height * 0.6;
    final left = (size.width - rectWidth) / 2;
    final top = (size.height - rectHeight) / 2;
    
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(left, top, rectWidth, rectHeight),
      const Radius.circular(24),
    );

      
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
        Path()..addRRect(rrect),
      ),
      paint,
    );

    // Draw dashed bounding border guide
    final borderPaint = Paint()
      ..color = laserColor.withOpacity(0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawRRect(rrect, borderPaint);

    // Draw scanning laser line
    final laserPaint = Paint()
      ..color = laserColor
      ..strokeWidth = 2
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          laserColor.withOpacity(0.1),
          laserColor,
          laserColor.withOpacity(0.1),
        ],
      ).createShader(Rect.fromLTWH(left, top + (rectHeight * progress) - 5, rectWidth, 10));

    canvas.drawLine(
      Offset(left + 10, top + (rectHeight * progress)),
      Offset(left + rectWidth - 10, top + (rectHeight * progress)),
      laserPaint,
    );
  }

  @override
  bool shouldRepaint(covariant ScannerOverlayPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
