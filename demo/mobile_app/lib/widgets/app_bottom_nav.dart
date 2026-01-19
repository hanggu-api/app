import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/realtime_service.dart';

class AppBottomNav extends StatefulWidget {
  final int currentIndex;
  final bool? isProvider;
  const AppBottomNav({super.key, required this.currentIndex, this.isProvider});

  @override
  State<AppBottomNav> createState() => _AppBottomNavState();
}

class _AppBottomNavState extends State<AppBottomNav> {
  String? _role;
  bool _isMedical = false;
  int _unread = 0;
  int? _myUserId;

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((prefs) {
      _role = prefs.getString('user_role');
      _isMedical = prefs.getBool('is_medical') ?? false;
      _unread = prefs.getInt('unread_chat_count') ?? 0;
      final userId = prefs.getInt('user_id');
      _myUserId = userId;
      if (mounted) setState(() {});

      final rt = RealtimeService();
      rt.connect();

      if (userId != null) {
        rt.authenticate(userId);
      }

      // Listen for new chat messages
      void handleNewMessage(dynamic data) async {
        final senderId = data is Map ? data['sender_id'] : null;
        // Don't count my own messages if they ever come back to me
        if (_myUserId != null &&
            senderId != null &&
            senderId.toString() == _myUserId.toString()) {
          return;
        }
        
        _unread += 1;
        final p = await SharedPreferences.getInstance();
        await p.setInt('unread_chat_count', _unread);
        if (mounted) setState(() {});
      }

      rt.on('chat.message', handleNewMessage);
      rt.on('chat_message', handleNewMessage);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isProvider = widget.isProvider ?? (_role == 'provider');
    final items = isProvider
        ? [
            BottomNavigationBarItem(
              icon: const Icon(LucideIcons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(icon: _chatIcon(), label: 'Chat'),
            BottomNavigationBarItem(
              icon: const Icon(LucideIcons.user),
              label: 'Perfil',
            ),
            BottomNavigationBarItem(
              icon: const Icon(LucideIcons.settings),
              label: 'Configurações',
            ),
          ]
        : [
            BottomNavigationBarItem(
              icon: const Icon(LucideIcons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(icon: _chatIcon(), label: 'Chat'),
            BottomNavigationBarItem(
              icon: const Icon(LucideIcons.settings),
              label: 'Configurações',
            ),
          ];
    final safeIndex = (widget.currentIndex < 0)
        ? 0
        : (widget.currentIndex >= items.length
              ? items.length - 1
              : widget.currentIndex);
    return BottomNavigationBar(
      selectedItemColor: Theme.of(context).colorScheme.secondary,
      unselectedItemColor: Colors.grey,
      showSelectedLabels: true,
      currentIndex: safeIndex,
      type: BottomNavigationBarType.fixed,
      onTap: (idx) {
        // if (idx == safeIndex) return; // Allow re-tapping to reset stack
        if (isProvider) {
          switch (idx) {
            case 0:
              context.go(_isMedical ? '/medical-home' : '/provider-home');
              break;
            case 1:
              context.go('/chats');
              break;
            case 2:
              context.go('/provider-profile');
              break;
            case 3:
              context.go('/client-settings');
              break;
          }
        } else {
          switch (idx) {
            case 0:
              context.go('/home');
              break;
            case 1:
              context.go('/chats');
              break;
            case 2:
              context.go('/client-settings');
              break;
          }
        }
      },
      items: items,
    );
  }

  Widget _chatIcon() {
    if (_unread > 0) {
      return Badge(
        label: Text('$_unread'),
        child: const Icon(LucideIcons.messageSquare),
      );
    }
    return const Icon(LucideIcons.messageSquare);
  }
}
