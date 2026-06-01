import 'package:flutter/material.dart';
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:permission_handler/permission_handler.dart';

class FaceCaptureScreen extends StatefulWidget {
  const FaceCaptureScreen({super.key});

  @override
  State<FaceCaptureScreen> createState() => _FaceCaptureScreenState();
}

class _FaceCaptureScreenState extends State<FaceCaptureScreen> {
  List<CameraDescription> _cameras = [];
  CameraController? _cameraController;
  bool _cameraInitialized = false;
  bool _isLoading = true;
  String? _errorMessage;

  Uint8List? _capturedBytes;
  bool _isFrontCamera = true;

  @override
  void initState() {
    super.initState();
    _requestPermissionAndInit();
  }

  Future<void> _requestPermissionAndInit() async {
    final status = await Permission.camera.request();
    if (status.isGranted) {
      _initializeCamera();
    } else {
      setState(() {
        _errorMessage = "Camera permission is required to capture photos.";
        _isLoading = false;
      });
    }
  }

  Future<void> _initializeCamera() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        setState(() {
          _errorMessage = "No camera hardware detected.";
          _isLoading = false;
        });
        return;
      }

      // Find preferred camera
      CameraDescription selectedCamera = _cameras.first;
      for (var camera in _cameras) {
        if (_isFrontCamera && camera.lensDirection == CameraLensDirection.front) {
          selectedCamera = camera;
          break;
        } else if (!_isFrontCamera && camera.lensDirection == CameraLensDirection.back) {
          selectedCamera = camera;
          break;
        }
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
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = "Failed to initialize camera: $e";
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleCameraDirection() async {
    if (_cameras.length < 2) return;
    setState(() {
      _isFrontCamera = !_isFrontCamera;
      _cameraInitialized = false;
    });
    _initializeCamera();
  }

  Future<void> _capturePhoto() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;

    try {
      setState(() {
        _isLoading = true;
      });

      final file = await _cameraController!.takePicture();
      final bytes = await file.readAsBytes();

      setState(() {
        _capturedBytes = bytes;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = "Capture failed: $e";
        _isLoading = false;
      });
    }
  }

  void _retakePhoto() {
    setState(() {
      _capturedBytes = null;
      _errorMessage = null;
    });
  }

  void _confirmPhoto() {
    if (_capturedBytes != null) {
      Navigator.pop(context, _capturedBytes);
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
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
        title: const Text("Capture Student Face", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading && !_cameraInitialized && _capturedBytes == null
          ? const Center(child: CircularProgressIndicator(color: primaryColor))
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.all(20.0),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: borderSlate, width: 1.5),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        // State 1: Display Live Camera Preview
                        if (_capturedBytes == null && _cameraInitialized && _cameraController != null)
                          CameraPreview(_cameraController!)
                        // State 2: Display Captured Photo Preview
                        else if (_capturedBytes != null)
                          Image.memory(_capturedBytes!, fit: BoxFit.cover)
                        // State 3: Error Message
                        else if (_errorMessage != null)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24.0),
                              child: Text(
                                _errorMessage!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Colors.redAccent, fontSize: 14),
                              ),
                            ),
                          ),

                        // Face Cutout Frame overlay (only on Live Camera View)
                        if (_capturedBytes == null && _cameraInitialized)
                          CustomPaint(
                            painter: FaceCaptureOverlayPainter(guideColor: primaryColor),
                          ),
                      ],
                    ),
                  ),
                ),

                // Controls Block at bottom
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
                  decoration: const BoxDecoration(
                    color: cardColor,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: _capturedBytes == null
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            // Switch camera direction button
                            IconButton(
                              onPressed: _cameras.length > 1 ? _toggleCameraDirection : null,
                              icon: const Icon(Icons.flip_camera_ios, color: Colors.white, size: 28),
                              style: IconButton.styleFrom(
                                backgroundColor: borderSlate,
                                padding: const EdgeInsets.all(12),
                              ),
                            ),

                            // Capture trigger button
                            FloatingActionButton(
                              onPressed: _cameraInitialized ? _capturePhoto : null,
                              backgroundColor: primaryColor,
                              foregroundColor: backgroundColor,
                              child: const Icon(Icons.camera_alt, size: 28),
                            ),

                            // Placeholder for visual balance
                            const SizedBox(width: 52),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            // Retake button
                            ElevatedButton.icon(
                              onPressed: _retakePhoto,
                              icon: const Icon(Icons.refresh, size: 18),
                              label: const Text("Retake"),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: borderSlate,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),

                            // Confirm button
                            ElevatedButton.icon(
                              onPressed: _confirmPhoto,
                              icon: const Icon(Icons.check, size: 18),
                              label: const Text("Confirm"),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: primaryColor,
                                foregroundColor: backgroundColor,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ],
                        ),
                ),
              ],
            ),
    );
  }
}

class FaceCaptureOverlayPainter extends CustomPainter {
  final Color guideColor;
  FaceCaptureOverlayPainter({required this.guideColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.55)
      ..style = PaintingStyle.fill;

    final ovalWidth = size.width * 0.65;
    final ovalHeight = size.height * 0.55;
    final left = (size.width - ovalWidth) / 2;
    final top = (size.height - ovalHeight) / 2;

    final faceOval = Rect.fromLTWH(left, top, ovalWidth, ovalHeight);

    // Draw dark shaded outer layers around the face oval
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
        Path()..addOval(faceOval),
      ),
      paint,
    );

    // Draw oval guide border
    final borderPaint = Paint()
      ..color = guideColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;
    canvas.drawOval(faceOval, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
