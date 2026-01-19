import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:video_player/video_player.dart';

import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';
import '../shared/in_app_camera_screen.dart';

class FinishServiceScreen extends StatefulWidget {
  final String serviceId;

  const FinishServiceScreen({super.key, required this.serviceId});

  @override
  State<FinishServiceScreen> createState() => _FinishServiceScreenState();
}

class _FinishServiceScreenState extends State<FinishServiceScreen> {
  final _codeController = TextEditingController();
  final _api = ApiService();
  final ImagePicker _picker = ImagePicker();

  XFile? _video;
  VideoPlayerController? _videoController;
  String? _error;
  bool _submitting = false;

  bool get _isFormValid =>
      _codeController.text.length >= 4 && _video != null && !_submitting;

  @override
  void initState() {
    super.initState();
    _retrieveLostData();
  }

  @override
  void dispose() {
    _codeController.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _retrieveLostData() async {
    final LostDataResponse response = await _picker.retrieveLostData();
    if (response.isEmpty) return;
    if (response.file != null && response.type == RetrieveType.video) {
      _setVideo(response.file!);
    } else {
      _handleError(response.exception);
    }
  }

  Future<void> _setVideo(XFile video) async {
    try {
      final controller = VideoPlayerController.file(File(video.path));
      await controller.initialize();
      setState(() {
        _video = video;
        _videoController = controller;
        _error = null;
      });
    } catch (e) {
      setState(() => _error = 'Erro ao carregar vídeo: $e');
    }
  }

  void _handleError(PlatformException? exception) {
    setState(() {
      _error = exception?.message ?? 'Erro desconhecido ao recuperar dados';
    });
  }

  Future<void> _pickVideo() async {
    try {
      final video = await Navigator.push<XFile>(
        context,
        MaterialPageRoute(
          builder: (context) => const InAppCameraScreen(isVideo: true),
        ),
      );
      if (video != null) await _setVideo(video);
    } catch (e) {
      setState(() => _error = 'Erro ao abrir câmera: $e');
    }
  }

  Future<void> _submit() async {
    if (!_isFormValid) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final videoKey = await _api.uploadServiceVideoFromPath(
        _video!.path,
        filename: _video!.name,
      );

      await _api.completeService(
        widget.serviceId,
        proofCode: _codeController.text,
        proofVideo: videoKey,
      );

      if (!mounted) return;
      
      await _showSuccessDialog();
      
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Erro ao concluir serviço: $e';
          _submitting = false;
        });
      }
    }
  }

  Future<void> _showSuccessDialog() async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 40),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.check, color: Colors.green, size: 40),
              ),
              const SizedBox(height: 24),
              const Text(
                'Serviço Concluído!',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: Colors.black,
                  decoration: TextDecoration.none,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Tudo certo. O registro foi enviado e o saldo será creditado conforme o ciclo.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.normal,
                  color: Colors.grey,
                  decoration: TextDecoration.none,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('OK'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Finalizar Atendimento'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildMissionHeader(),
            const SizedBox(height: 32),
            _buildCodeSection(),
            const SizedBox(height: 32),
            _buildVideoSection(),
            if (_error != null) ...[
              const SizedBox(height: 24),
              _buildErrorBadge(),
            ],
            const SizedBox(height: 48),
            _buildSubmitButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildMissionHeader() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.primaryPurple.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(LucideIcons.rocket, color: AppTheme.primaryPurple, size: 32),
        ),
        const SizedBox(height: 16),
        const Text(
          'Quase lá!',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
        ),
        const Text(
          'Envie as evidências para finalizar o atendimento.',
          style: TextStyle(color: Colors.grey),
        ),
      ],
    );
  }

  Widget _buildCodeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'CÓDIGO DE VALIDAÇÃO',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: Colors.grey),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _codeController,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: 16),
          maxLength: 6,
          decoration: InputDecoration(
            counterText: '',
            hintText: '0000',
            hintStyle: TextStyle(color: Colors.grey[200]),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey[200]!)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey[200]!)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: AppTheme.primaryPurple, width: 2)),
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 8),
        const Text(
          'Solicite este código ao cliente após o serviço.',
          style: TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }

  Widget _buildVideoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'EVIDÊNCIA EM VÍDEO',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: Colors.grey),
        ),
        const SizedBox(height: 12),
        if (_video != null && _videoController != null)
          _buildVideoPlayer()
        else
          _buildEmptyVideoState(),
      ],
    );
  }

  Widget _buildVideoPlayer() {
    return Column(
      children: [
        AspectRatio(
          aspectRatio: _videoController!.value.aspectRatio,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              alignment: Alignment.center,
              children: [
                VideoPlayer(_videoController!),
                Positioned.fill(
                  child: Material(
                    color: Colors.black26,
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _videoController!.value.isPlaying ? _videoController!.pause() : _videoController!.play();
                        });
                      },
                      child: Center(
                        child: Icon(
                          _videoController!.value.isPlaying ? LucideIcons.pause : LucideIcons.play,
                          size: 64,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextButton.icon(
          onPressed: _pickVideo,
          icon: const Icon(LucideIcons.refreshCw, size: 16),
          label: const Text('Gravar outro vídeo'),
          style: TextButton.styleFrom(foregroundColor: AppTheme.primaryPurple),
        ),
      ],
    );
  }

  Widget _buildEmptyVideoState() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: _pickVideo,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          width: double.infinity,
          height: 160,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[200]!),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.camera, color: AppTheme.primaryPurple.withValues(alpha: 0.4), size: 40),
              const SizedBox(height: 12),
              const Text(
                'Toque para gravar o vídeo',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black54),
              ),
              const Text(
                'Máximo de 2 minutos',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorBadge() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          const Icon(LucideIcons.alertCircle, color: Colors.red, size: 16),
          const SizedBox(width: 8),
          Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12))),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: _isFormValid ? [BoxShadow(color: AppTheme.primaryPurple.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4))] : null,
      ),
      child: ElevatedButton(
        onPressed: _isFormValid ? _submit : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryPurple,
          minimumSize: const Size(double.infinity, 60),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        child: _submitting
            ? const CircularProgressIndicator(color: Colors.white)
            : const Text(
                'FINALIZAR SERVIÇO',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 1.2),
              ),
      ),
    );
  }
}

