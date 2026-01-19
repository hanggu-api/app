import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class InAppCameraScreen extends StatefulWidget {
  final bool isVideo;
  const InAppCameraScreen({super.key, this.isVideo = true});

  @override
  State<InAppCameraScreen> createState() => _InAppCameraScreenState();
}

class _InAppCameraScreenState extends State<InAppCameraScreen> {
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  bool _isRecording = false;
  bool _isInitialized = false;
  int _selectedCameraIndex = 0;
  DateTime? _recordingStartedAt;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) return;
      
      await _onNewCameraSelected(_cameras[_selectedCameraIndex]);
    } catch (e) {
      debugPrint('Error initializing camera: $e');
    }
  }

  Future<void> _onNewCameraSelected(CameraDescription cameraDescription) async {
    if (_controller != null) {
      await _controller!.dispose();
    }

    _controller = CameraController(
      cameraDescription,
      ResolutionPreset.medium,
      enableAudio: true,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );

    try {
      await _controller!.initialize();
      if (mounted) {
        setState(() => _isInitialized = true);
      }
    } catch (e) {
      debugPrint('Error initializing controller: $e');
    }
  }

  Future<void> _toggleRecording() async {
    if (!_isInitialized || _controller == null) return;

    if (_isRecording) {
      try {
        // Safety delay
        final elapsed = DateTime.now().difference(_recordingStartedAt!);
        if (elapsed.inMilliseconds < 1500) {
          await Future.delayed(Duration(milliseconds: 1500 - elapsed.inMilliseconds));
        }

        final file = await _controller!.stopVideoRecording();
        setState(() => _isRecording = false);
        if (mounted) Navigator.pop(context, file);
      } catch (e) {
        debugPrint('Error stopping recording: $e');
      }
    } else {
      try {
        await _controller!.startVideoRecording();
        setState(() {
          _isRecording = true;
          _recordingStartedAt = DateTime.now();
        });
      } catch (e) {
        debugPrint('Error starting recording: $e');
      }
    }
  }

  Future<void> _takePhoto() async {
    if (!_isInitialized || _controller == null) return;
    try {
      final file = await _controller!.takePicture();
      if (mounted) Navigator.pop(context, file);
    } catch (e) {
      debugPrint('Error taking photo: $e');
    }
  }

  void _switchCamera() async {
    if (_cameras.length < 2) return;
    _selectedCameraIndex = (_selectedCameraIndex + 1) % _cameras.length;
    await _onNewCameraSelected(_cameras[_selectedCameraIndex]);
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized || _controller == null) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          CameraPreview(_controller!),
          
          // Header
          Positioned(
            top: 40,
            left: 20,
            child: IconButton(
              icon: const Icon(LucideIcons.x, color: Colors.white, size: 30),
              onPressed: () => Navigator.pop(context),
            ),
          ),

          // Controls
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Column(
              children: [
                if (_isRecording)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.circle, color: Colors.red, size: 12),
                        SizedBox(width: 8),
                        Text(
                          'GRAVANDO',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconButton(
                      icon: const Icon(LucideIcons.refreshCcw, color: Colors.white, size: 30),
                      onPressed: _isRecording ? null : _switchCamera,
                    ),
                    GestureDetector(
                      onTap: widget.isVideo ? _toggleRecording : _takePhoto,
                      child: Container(
                        height: 80,
                        width: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 4),
                        ),
                        child: Center(
                          child: Container(
                            height: _isRecording ? 30 : 60,
                            width: _isRecording ? 30 : 60,
                            decoration: BoxDecoration(
                              color: widget.isVideo ? Colors.red : Colors.white,
                              borderRadius: BorderRadius.circular(_isRecording ? 4 : 30),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 48), // Spacer for switch camera balance
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
