import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../services/realtime_service.dart';
import '../../utils/file_bytes.dart';
import '../../widgets/app_bottom_nav.dart';
import '../../widgets/user_avatar.dart';

class ChatScreen extends StatefulWidget {
  final String serviceId;
  const ChatScreen({super.key, required this.serviceId});

  static String? activeChatServiceId;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _api = ApiService();
  final _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<dynamic> _messages = [];
  // Mostrar a lista invertida para que a última mensagem fique sempre na parte inferior.
  Timer? _pollingTimer;
  StreamSubscription? _chatSubscription;
  Map<String, dynamic>? _serviceDetails;
  int? _myUserId;
  final AudioRecorder _rec = AudioRecorder();
  bool _isRecording = false;
  DateTime? _recordStartAt;
  Timer? _recordTicker;
  // REMOVIDO: final GlobalKey _quickRepliesKey = GlobalKey();
  String? _role;
  final GlobalKey _inputAreaKey = GlobalKey();

  // Valor inicial ajustado para a altura de apenas a área de input (aprox. 80)
  double _bottomPadding = 80;
  int? _otherUserId;
  bool _isOtherOnline = false;

  final Map<String, Future<Uint8List>> _imageFutureCache = {};

  Future<Uint8List> _fetchImageBytesCached(String key) {
    return _imageFutureCache.putIfAbsent(key, () => _api.getMediaBytes(key));
  }

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((prefs) {
      if (mounted) {
        setState(() {
          _role = prefs.getString('user_role');
        });
        _calculateOtherUser();
      }
    });

    _api.getMyUserId().then((id) {
      if (mounted) setState(() => _myUserId = id);
      if (id != null) {
        RealtimeService().authenticate(id);
      }
      _calculateOtherUser();
    });
    _loadServiceInfo();
    final rt = RealtimeService();
    rt.connect();

    // Firebase Chat Stream
    debugPrint('[IMPORTANT] Starting chat subscription for service ${widget.serviceId}');
    _chatSubscription = rt.getChatStream(widget.serviceId).listen((snapshot) {
      debugPrint('[IMPORTANT] Chat snapshot received: ${snapshot.docs.length} messages');
      
      final msgs = snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return data;
      }).toList();

      // Sort: Newest First (index 0)
      msgs.sort((a, b) => _parseMessageDate(b).compareTo(_parseMessageDate(a)));

      if (mounted) {
        setState(() => _messages = msgs);
        if (_scrollController.hasClients && _scrollController.offset < 100) {
          _scrollToBottom();
        }
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) => _updateBottomPadding());
    unawaited(
      SharedPreferences.getInstance().then(
        (p) => p.setInt('unread_chat_count', 0),
      ),
    );
    ChatScreen.activeChatServiceId = widget.serviceId;
  }

  @override
  void dispose() {
    if (ChatScreen.activeChatServiceId == widget.serviceId) {
      ChatScreen.activeChatServiceId = null;
    }
    _chatSubscription?.cancel();
    RealtimeService().leaveService();
    _pollingTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadServiceInfo() async {
    try {
      final details = await _api.getServiceDetails(widget.serviceId);
      if (mounted) {
        setState(() => _serviceDetails = details);
        _calculateOtherUser();
      }
    } catch (_) {}
  }

  void _calculateOtherUser() {
    if (_serviceDetails == null) return;
    // We can try to calc even if _role is null, but better with it.
    // However, for robust ID logic we need _role or _myUserId.
    // If both null, we wait.
    if (_role == null && _myUserId == null) return;

    final s = _serviceDetails!;

    bool isMeClient = false;
    if (_role == 'client') {
      isMeClient = true;
    } else if (_role == 'provider') {
      isMeClient = false;
    } else {
      final myIdStr = _myUserId?.toString();
      dynamic userIdRaw = s['user_id'];
      if (userIdRaw == null && s['client'] is Map) {
        userIdRaw = s['client']['id'];
      }
      final serviceUserIdStr = userIdRaw?.toString();
      isMeClient = serviceUserIdStr != null && myIdStr == serviceUserIdStr;
    }

    int? targetId;
    if (isMeClient) {
      if (s['provider_id'] != null) {
        targetId = s['provider_id'] is int
            ? s['provider_id']
            : int.tryParse(s['provider_id'].toString());
      }
      if (targetId == null && s['provider'] is Map) {
        final pId = s['provider']['id'];
        if (pId != null) {
          targetId = pId is int ? pId : int.tryParse(pId.toString());
        }
      }
    } else {
      if (s['client_id'] != null) {
        targetId = s['client_id'] is int
            ? s['client_id']
            : int.tryParse(s['client_id'].toString());
      }
      if (targetId == null && s['client'] is Map) {
        final cId = s['client']['id'];
        if (cId != null) {
          targetId = cId is int ? cId : int.tryParse(cId.toString());
        }
      }
    }

    if (targetId != null && targetId != _otherUserId) {
      setState(() => _otherUserId = targetId);
      RealtimeService().checkStatus(targetId, (online) {
        if (mounted) setState(() => _isOtherOnline = online);
      });
    }
  }


  Future<void> _sendMessage({String? content}) async {
    final text = content ?? _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    try {
      await _api.sendMessage(widget.serviceId, text);
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro ao enviar: $e')));
      }
    }
  }

  Future<void> _sendImage() async {
    // Web/Desktop: usar FilePicker
    try {
      final res = await FilePicker.platform.pickFiles(
        type: FileType.image,
        withData: true,
      );
      if (res != null &&
          res.files.isNotEmpty &&
          res.files.first.bytes != null) {
        final f = res.files.first;
        final key = await _api.uploadChatImage(
          widget.serviceId,
          f.bytes!,
          filename: f.name,
        );
        await _api.sendMessage(widget.serviceId, key, type: 'image');
        _scrollToBottom();
        return;
      }
    } catch (_) {}
    // Mobile: ImagePicker
    try {
      final picker = ImagePicker();
      final xfile = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (xfile != null) {
        final bytes = await xfile.readAsBytes();
        final key = await _api.uploadChatImage(
          widget.serviceId,
          bytes,
          filename: xfile.name,
        );
        await _api.sendMessage(widget.serviceId, key, type: 'image');
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro ao selecionar imagem: $e')));
      }
    }
  }

  Future<void> _toggleRecord() async {
    try {
      if (!_isRecording) {
        final has = await _rec.hasPermission();
        if (!has) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Permissão de microfone negada')),
            );
          }
          return;
        }
        final config = const RecordConfig();
        final dir = await getTemporaryDirectory();
        final path =
            '${dir.path}/audio_${DateTime.now().millisecondsSinceEpoch}.m4a';
        await _rec.start(config, path: path);
        setState(() {
          _isRecording = true;
          _recordStartAt = DateTime.now();
          _recordTicker?.cancel();
          _recordTicker = Timer.periodic(const Duration(seconds: 1), (_) {
            if (mounted) setState(() {});
          });
        });
      } else {
        // Safety delay to prevent "Stop() called but track is not started" error
        final elapsed = DateTime.now().difference(_recordStartAt!);
        if (elapsed.inMilliseconds < 800) {
          await Future.delayed(Duration(milliseconds: 800 - elapsed.inMilliseconds));
        }
        
        final path = await _rec.stop();
        setState(() {
          _isRecording = false;
          _recordTicker?.cancel();
        });
        if (path == null) return;
        final bytes = await readFileBytes(path);
        String mime;
        String filename;
        if (kIsWeb) {
          mime = 'audio/webm';
          filename = 'audio.webm';
        } else {
          if (path.endsWith('.m4a')) {
            mime = 'audio/x-m4a';
          } else if (path.endsWith('.aac')) {
            mime = 'audio/aac';
          } else if (path.endsWith('.wav')) {
            mime = 'audio/wav';
          } else {
            mime = 'audio/mpeg';
          }
          filename = path.split('/').last;
        }
        final key = await _api.uploadChatAudio(
          widget.serviceId,
          bytes,
          filename: filename,
          mimeType: mime,
        );
        await _api.sendMessage(widget.serviceId, key, type: 'audio');
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro de gravação: $e')));
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          0.0, // Because reversed: true, 0.0 is the bottom
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _updateBottomPadding() {
    final inCtx = _inputAreaKey.currentContext;
    final inH = (inCtx?.size?.height ?? 0);
    final newVal = inH + 10;
    if (newVal > 0 && (newVal - _bottomPadding).abs() > 1) {
      setState(() => _bottomPadding = newVal);
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_serviceDetails == null || _myUserId == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final s = _serviceDetails!;

    // 1. Determine who I am (Client vs Provider)
    bool isMeClient = false;
    if (_role == 'client') {
      isMeClient = true;
    } else if (_role == 'provider') {
      isMeClient = false;
    } else {
      // Fallback: compare IDs
      final myIdStr = _myUserId.toString();
      dynamic userIdRaw = s['user_id'];
      if (userIdRaw == null && s['client'] is Map) {
        userIdRaw = s['client']['id'];
      }
      final serviceUserIdStr = userIdRaw?.toString();
      isMeClient = serviceUserIdStr != null && myIdStr == serviceUserIdStr;
    }

    String otherName;
    String? otherAvatar;
    int? otherId;

    if (isMeClient) {
      // I am Client -> Show Provider
      otherName =
          s['provider_name']?.toString() ??
          s['professional_name']?.toString() ??
          (s['provider'] is Map ? s['provider']['name']?.toString() : null) ??
          'Prestador';

      otherAvatar =
          s['provider_avatar']?.toString() ??
          s['professional_avatar']?.toString() ??
          s['provider_photo']?.toString() ??
          s['provider_image']?.toString() ??
          (s['provider'] is Map
              ? (s['provider']['avatar']?.toString() ??
                    s['provider']['photo']?.toString() ??
                    s['provider']['image']?.toString())
              : null);

      if (s['provider_id'] != null) {
        otherId = s['provider_id'] is int
            ? s['provider_id']
            : int.tryParse(s['provider_id'].toString());
      }
      if (otherId == null && s['provider'] is Map) {
        final pId = s['provider']['id'];
        if (pId != null) {
          otherId = pId is int ? pId : int.tryParse(pId.toString());
        }
      }
    } else {
      // I am Provider -> Show Client
      otherName =
          s['client_name']?.toString() ??
          s['user_name']?.toString() ??
          (s['client'] is Map ? s['client']['name']?.toString() : null) ??
          'Cliente';

      otherAvatar =
          s['client_avatar']?.toString() ??
          s['user_avatar']?.toString() ??
          s['client_photo']?.toString() ??
          s['user_photo']?.toString() ??
          (s['client'] is Map
              ? (s['client']['avatar']?.toString() ??
                    s['client']['photo']?.toString() ??
                    s['client']['image']?.toString())
              : null);

      if (s['client_id'] != null) {
        otherId = s['client_id'] is int
            ? s['client_id']
            : int.tryParse(s['client_id'].toString());
      }
      if (otherId == null && s['client'] is Map) {
        final cId = s['client']['id'];
        if (cId != null) {
          otherId = cId is int ? cId : int.tryParse(cId.toString());
        }
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFE5DDD5), // WhatsApp background color
      appBar: AppBar(
        title: Row(
          children: [
            UserAvatar(
              avatar: otherAvatar,
              name: otherName,
              userId: otherId,
              showOnlineStatus: true,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    otherName,
                    style: const TextStyle(
                      fontSize: 16,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (_isOtherOnline)
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: AppTheme.successGreen,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          'Online',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Messages Area
          Expanded(
            child: Scrollbar(
              controller: _scrollController,
              thumbVisibility: true,
              child: ListView.builder(
                controller: _scrollController,
                reverse: true, 
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                itemCount: _messages.length,
                itemBuilder: (context, index) {                  
                  final msg = _messages[index];

                  final senderIdRaw = msg['sender_id'];
                  final isMe =
                      _myUserId != null && senderIdRaw.toString() == _myUserId.toString();
                  
                  if (index == 0) {
                    debugPrint('[VERYIMPORTANT] Bottom message: ${msg['content']}, time: ${msg['created_at']}');
                  }

                  final type = (msg['type'] ?? 'text').toString();

                  final ts = (msg['created_at'] ?? msg['sent_at'])?.toString();
                  final time = ts != null && ts.length >= 16
                      ? ts.substring(11, 16)
                      : 'Agora';
                  return _buildMessageBubble(
                    (msg['content'] ?? '').toString(),
                    type,
                    isMe,
                    time,
                  );
                },
              ),
            ),
          ),

          // Input Area
          Container(
            key: _inputAreaKey,
            // AJUSTE: Adiciona o padding inferior da área segura
            padding: EdgeInsets.fromLTRB(
              12,
              8,
              12,
              8 + MediaQuery.of(context).padding.bottom,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(LucideIcons.image),
                  color: Colors.grey[600],
                  onPressed: _sendImage,
                ),
                IconButton(
                  icon: Icon(
                    _isRecording ? LucideIcons.stopCircle : LucideIcons.mic,
                  ),
                  color: _isRecording ? Colors.red : Colors.grey[600],
                  onPressed: _toggleRecord,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    minLines: 1,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Mensagem',
                      filled: true,
                      fillColor: Colors.white,
                      isDense: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: const BoxDecoration(
                    color: Color(0xFF10CE5E), // WhatsApp/Like Green/Teal
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(
                      LucideIcons.send,
                      color: Colors.white,
                      size: 20,
                    ),
                    onPressed: () => _sendMessage(),
                  ),
                ),
              ],
            ),
          ),
          if (_isRecording)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.all(8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(LucideIcons.mic, color: Colors.red, size: 16),
                  const SizedBox(width: 8),
                  Text('Gravando... ${_formatElapsed()}'),
                ],
              ),
            ),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 1),
    );
  }

  String _formatElapsed() {
    if (_recordStartAt == null) return '00:00';
    final d = DateTime.now().difference(_recordStartAt!);
    final mm = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final ss = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$mm:$ss';
  }

  void _openImageModal(Uint8List bytes) {
    showDialog(
      context: context,
      builder: (ctx) {
        final size = MediaQuery.of(ctx).size;
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(12),
          child: GestureDetector(
            onTap: () => Navigator.of(ctx).pop(),
            child: SizedBox(
              width: size.width,
              height: size.height * 0.85,
              child: InteractiveViewer(
                panEnabled: true,
                minScale: 1.0,
                maxScale: 4.0,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.memory(bytes, fit: BoxFit.contain),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildMessageBubble(
    String content,
    String type,
    bool isMe,
    String time,
  ) {
    final isImage = type == 'image';
    Widget bubbleChild;
    if (isImage) {
      bubbleChild = ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: FutureBuilder<Uint8List>(
          future: _fetchImageBytesCached(content),
          builder: (context, snap) {
            if (!snap.hasData) {
              return Container(width: 220, height: 140, color: Colors.black12);
            }
            return GestureDetector(
              onTap: () => _openImageModal(snap.data!),
              child: Image.memory(
                snap.data!,
                width: 220,
                fit: BoxFit.cover,
                gaplessPlayback: true,
              ),
            );
          },
        ),
      );
    } else if (type == 'audio') {
      bubbleChild = AudioBubble(mediaKey: content, api: _api, isMe: isMe);
    } else {
      bubbleChild = Text(
        content,
        style: TextStyle(
          color: isMe ? Colors.white : Colors.black87,
          fontSize: 15,
        ),
      );
    }

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: isImage
            ? const EdgeInsets.all(4)
            : const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isImage
              ? Colors.transparent
              : (isMe ? Colors.black : Colors.white),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: isMe ? const Radius.circular(18) : Radius.zero,
            bottomRight: isMe ? Radius.zero : const Radius.circular(18),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisSize: MainAxisSize.min,
          children: [
            bubbleChild,
            const SizedBox(height: 2),
            Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  time,
                  style: TextStyle(
                    color: isMe ? Colors.white70 : Colors.grey[600],
                    fontSize: 10,
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 4),
                  const Icon(
                    LucideIcons.checkCheck,
                    size: 14,
                    color: Colors.blueAccent, // Ou white70 se preferir discreto
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  DateTime _parseMessageDate(Map<String, dynamic> msg) {
    try {
      var val = msg['created_at'] ?? msg['sent_at'] ?? msg['createdAt'] ?? msg['sentAt'] ?? msg['timestamp'];
      if (val == null) return DateTime.fromMillisecondsSinceEpoch(0);
      if (val is Timestamp) return val.toDate();
      if (val is int) return DateTime.fromMillisecondsSinceEpoch(val);
      if (val is String) return DateTime.tryParse(val) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return DateTime.fromMillisecondsSinceEpoch(0);
    } catch (e) {
      return DateTime.fromMillisecondsSinceEpoch(0);
    }
  }

  // REMOVIDO: Widget _buildQuickReply(String text) { ... }
}

// AudioBubble e _AudioBubbleState permanecem inalterados.
// ... (código do AudioBubble)

class AudioBubble extends StatefulWidget {
  final String mediaKey;
  final ApiService api;
  final bool isMe;
  const AudioBubble({
    super.key,
    required this.mediaKey,
    required this.api,
    required this.isMe,
  });

  @override
  State<AudioBubble> createState() => _AudioBubbleState();
}

class _AudioBubbleState extends State<AudioBubble> {
  final AudioPlayer _player = AudioPlayer();
  bool _loadingUrl = true;
  Uint8List? _bytes;
  bool _playing = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;

  @override
  void initState() {
    super.initState();
    widget.api
        .getMediaBytes(widget.mediaKey)
        .then((b) {
          if (!mounted) return;
          setState(() {
            _bytes = b;
            _loadingUrl = false;
          });
        })
        .catchError((e) {
          debugPrint('Error loading audio bytes: $e');
          if (mounted) setState(() => _loadingUrl = false);
        });

    _player.onPlayerComplete.listen(
      (_) => setState(() {
        _playing = false;
        _position = Duration.zero;
      }),
    );
    _player.onDurationChanged.listen((d) {
      if (mounted) setState(() => _duration = d);
    });
    _player.onPositionChanged.listen((p) {
      if (mounted) setState(() => _position = p);
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _togglePlay() async {
    if (_loadingUrl || _bytes == null) return;

    try {
      if (_playing) {
        await _player.pause();
        setState(() => _playing = false);
      } else {
        if (_player.state == PlayerState.paused) {
          await _player.resume();
        } else {
          if (kIsWeb) {
            final base64Audio = base64Encode(_bytes!);
            final mimeType = 'audio/mpeg';
            final dataUri = 'data:$mimeType;base64,$base64Audio';
            await _player.play(UrlSource(dataUri));
          } else {
            final tempDir = await getTemporaryDirectory();
            final file = File(
              '${tempDir.path}/audio_${widget.mediaKey.hashCode}.m4a',
            );
            if (!await file.exists()) {
              await file.writeAsBytes(_bytes!);
            }
            await _player.play(DeviceFileSource(file.path));
          }
        }
        setState(() => _playing = true);
      }
    } catch (e) {
      debugPrint('Error playing audio: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro ao reproduzir áudio: $e')));
      }
      setState(() => _playing = false);
    }
  }

  String _formatDuration(Duration d) {
    final mm = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final ss = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$mm:$ss';
  }

  @override
  Widget build(BuildContext context) {
    final isMe = widget.isMe;
    // Texto/Ícones baseados no fundo do balão
    final fgColor = isMe ? Colors.white : Colors.black87;
    // Cor de destaque (Play/Slider) solicitada: Laranja
    final accentColor = AppTheme.secondaryOrange;

    return Container(
      width: 240,
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          // Botão Play/Pause
          GestureDetector(
            onTap: _togglePlay,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: accentColor,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: _loadingUrl
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Icon(
                      _playing ? LucideIcons.pause : LucideIcons.play,
                      color: Colors.white,
                      size: 24,
                    ),
            ),
          ),
          const SizedBox(width: 12),

          // Slider e Tempo
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  height: 20,
                  child: SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      thumbShape: const RoundSliderThumbShape(
                        enabledThumbRadius: 6,
                      ),
                      overlayShape: const RoundSliderOverlayShape(
                        overlayRadius: 14,
                      ),
                      trackHeight: 3,
                      thumbColor: accentColor,
                      activeTrackColor: accentColor,
                      inactiveTrackColor: isMe
                          ? Colors.white.withValues(alpha: 0.3)
                          : Colors.grey.withValues(alpha: 0.3),
                    ),
                    child: Slider(
                      value: _position.inSeconds.toDouble().clamp(
                        0,
                        _duration.inSeconds.toDouble(),
                      ),
                      max: _duration.inSeconds.toDouble() > 0
                          ? _duration.inSeconds.toDouble()
                          : 1.0,
                      onChanged: (v) {
                        final pos = Duration(seconds: v.toInt());
                        _player.seek(pos);
                      },
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _formatDuration(_position),
                        style: TextStyle(
                          color: fgColor.withValues(alpha: 0.8),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        _formatDuration(_duration),
                        style: TextStyle(
                          color: fgColor.withValues(alpha: 0.8),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
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
