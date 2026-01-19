import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;

import '../features/client/widgets/provider_arrived_modal.dart';
import '../features/provider/widgets/service_offer_modal.dart';
import '../firebase_options.dart';
import 'api_service.dart';

/// Handler for background messages
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  if (kDebugMode) {
    debugPrint('Handling a background message: ${message.messageId}');
  }
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  // Use o sinal de exclamação ou garanta a instância
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;
  GlobalKey<NavigatorState>? navigatorKey;

  void init(GlobalKey<NavigatorState> navKey) {
    navigatorKey = navKey;
    initialize();
  }

  Future<void> initialize() async {
    if (_isInitialized) return;

    // 1. Setup Initial Message (Se app foi aberto via notificação)
    FirebaseMessaging.instance.getInitialMessage().then((
      RemoteMessage? message,
    ) {
      if (message != null) {
        if (kDebugMode) {
          debugPrint(
            'App opened from terminated state via notification: ${message.data}',
          );
        }
        _handleNotificationTap(message.data);
      }
    });

    // 2. Setup onMessageOpenedApp (Se app estava em background e foi aberto via notificação)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      if (kDebugMode) {
        debugPrint(
          'App opened from background state via notification: ${message.data}',
        );
      }
      _handleNotificationTap(message.data);
    });

    // Solicitar permissão (Essencial para iOS/Android moderno)
    try {
      NotificationSettings settings = await _fcm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        // Agora o acesso é seguro
        String? token = await _fcm.getToken();
        if (kDebugMode) debugPrint("FCM Token: $token");
      } else if (settings.authorizationStatus ==
          AuthorizationStatus.provisional) {
        if (kDebugMode) {
          debugPrint('User granted provisional permission');
        }
      } else {
        if (kDebugMode) {
          debugPrint('User declined or has not accepted permission');
        }
      }
    } catch (e) {
      debugPrint('Permission request error: $e');
    }

    // 2. Setup Local Notifications (for foreground display) AND Create Channel
    if (!kIsWeb) {
      const androidSettings = AndroidInitializationSettings(
        '@mipmap/launcher_icon',
      );
      const initSettings = InitializationSettings(android: androidSettings);

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: (response) {
          if (kDebugMode) {
            debugPrint('Notification tapped: ${response.payload}');
          }
          if (response.payload != null) {
            try {
              final data = jsonDecode(response.payload!);
              _handleNotificationTap(data);
            } catch (e) {
              debugPrint('Error parsing notification payload: $e');
            }
          }
        },
      );

      // CRITICAL: Create the channel explicitly to ensure High Importance settings
      // This is required for heads-up notifications even when app is backgrounded
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        'high_importance_channel', // id matching backend and manifest
        'Notificações Importantes', // title
        description:
            'Este canal é usado para notificações urgentes do serviço.', // description
        importance: Importance.max, // IMPORTANCE_MAX triggers heads-up
        playSound: true,
        sound: RawResourceAndroidNotificationSound('iphone_notificacao'),
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(channel);
    }

    // 3. Setup FCM Handlers
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      if (kDebugMode) {
        debugPrint('Got a message whilst in the foreground!');
        debugPrint('Message data: ${message.data}');
      }

      final type = message.data['type'];

      // Prevent "Provider Arrived" notification for the Provider themselves
      if (type == 'provider_arrived') {
        final role = ApiService().role;
        if (role == 'provider') {
          if (kDebugMode) debugPrint('Ignoring provider_arrived for provider');
          return;
        }
        // Client: Allow notification to show (fall through)
        // We don't auto-show modal here anymore to avoid conflicts/double-handling
        // HomeScreen will handle the modal via RealtimeService
      }

      // Auto-navigate if it's a new service
      // final type = message.data['type'];

      // Disable auto-navigation for foreground messages to prevent forcing user context switch
      // The ProviderHomeScreen already listens to RealtimeService events to update the UI
      const isAutoNavigate = false;

      /*
      // Explicitly exclude service_accepted and ensure only new/offered trigger nav
      final isAutoNavigate =
          type == 'new_service' || type == 'offer' || type == 'service_offered';

      // Check if we are already on the details screen for this service to avoid duplicate push
      // This requires access to current route which is hard, but we can prevent spam

      if (isAutoNavigate) {
        _handleNotificationTap(message.data);
      }
      */

      // Only show local notification if NOT auto-navigating
      // This prevents the "modal" (banner) from appearing on top of the auto-navigation
      if (message.notification != null && !isAutoNavigate) {
        _showLocalNotification(message);
      }
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      if (kDebugMode) {
        debugPrint('A new onMessageOpenedApp event was published!');
      }
      _handleNotificationTap(message.data);
    });

    // Check if app was opened from a terminated state
    RemoteMessage? initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      if (kDebugMode) {
        debugPrint('App opened from terminated state: ${initialMessage.data}');
      }
      _handleNotificationTap(initialMessage.data);
    }

    // 4. Get Token and Send to Backend
    String? token;
    try {
      if (kIsWeb) {
        token = await _fcm.getToken(
          vapidKey:
              'BHYsdm3OEj5MTSzYrIlPKf9qvaa-JU-Hv_b6CNeHoVjHNayHnEkQHUNRNPy1cYY4vjimNmfnHDXTSpzG3HDoj4k',
        );
      } else {
        token = await _fcm.getToken();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error getting token (likely permission blocked): $e');
      }
      // Do not rethrow, allow initialization to complete without token
    }

    if (token != null) {
      if (kDebugMode) debugPrint('FCM Token: $token');
      await _sendTokenToBackend(token);
    }

    // 5. Listen for token refresh
    _fcm.onTokenRefresh.listen((newToken) {
      _sendTokenToBackend(newToken);
    });

    _isInitialized = true;
  }

  /// Returns the current FCM token
  Future<String?> getToken() async {
    try {
      if (kIsWeb) {
        return await _fcm.getToken(
          vapidKey:
              'BHYsdm3OEj5MTSzYrIlPKf9qvaa-JU-Hv_b6CNeHoVjHNayHnEkQHUNRNPy1cYY4vjimNmfnHDXTSpzG3HDoj4k',
        );
      }
      return await _fcm.getToken();
    } catch (e) {
      debugPrint('Error getting token: $e');
      return null;
    }
  }

  /// Force send token to backend (useful after login)
  Future<void> syncToken() async {
    String? token;
    try {
      if (kIsWeb) {
        token = await _fcm.getToken(
          vapidKey:
              'BEqUWJS43XNNdq9ttjzmfbF-saY7SK0L5scQ6A75NM4_BiCGkvvBwSz2ArLPmVxV1zd8f8dwgoXc5f6sJRjK9Wo',
        );
      } else {
        token = await _fcm.getToken();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error syncing token (likely permission blocked): $e');
      }
      return; // Stop sync if we can't get token
    }

    if (token != null) {
      if (kDebugMode) debugPrint('Syncing FCM Token: $token');
      await _sendTokenToBackend(token);
    }
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      final api = ApiService();
      // Only send if logged in (token exists)
      final hasAuth = api.isLoggedIn;
      if (hasAuth) {
        // Handle platform correctly for web
        final platform = kIsWeb ? 'web' : Platform.operatingSystem;
        await api.registerDeviceToken(token, platform);
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Error sending token to backend: $e');
    }
  }

  // Legacy/Compatibility methods - Removed to avoid conflicts

  void _handleNotificationTap(Map<String, dynamic> data) {
    if (kDebugMode) debugPrint('Handling notification tap with data: $data');

    final type = data['type'];

    // Handle Chat Message
    if (type == 'chat_message' || type == 'chat') {
      final serviceId = data['id'] ?? data['service_id'];
      if (serviceId != null && navigatorKey?.currentContext != null) {
        // Ensure we push to chat, even if on another screen
        GoRouter.of(
          navigatorKey!.currentContext!,
        ).push('/chat', extra: serviceId.toString());
        return;
      }
    }

    // Handle Provider Arrived - Show Modal
    if (type == 'provider_arrived') {
      // Prevent showing modal to the provider
      if (ApiService().role == 'provider') {
        return;
      }

      final serviceId = data['id'] ?? data['service_id'];
      if (serviceId != null && navigatorKey?.currentContext != null) {
        showDialog(
          context: navigatorKey!.currentContext!,
          builder: (context) => ProviderArrivedModal(
            serviceId: serviceId.toString(),
            initialData: data,
          ),
        );
        return;
      }
    }

    // Handle Offer/New Service - Show Modal
    if (type == 'new_service' || type == 'offer' || type == 'service_offered') {
      final serviceId = data['id'] ?? data['service_id'];
      if (serviceId != null && navigatorKey?.currentContext != null) {
        showDialog(
          context: navigatorKey!.currentContext!,
          barrierDismissible: false,
          builder: (context) => ServiceOfferModal(
            serviceId: serviceId.toString(),
            initialData: data,
          ),
        );
        return;
      }
    }

    // Other service updates - Show Modal
    /*
    if (type == 'provider_arrived') {
      final serviceId = data['id'] ?? data['service_id'];
      if (serviceId != null && navigatorKey?.currentContext != null) {
        showDialog(
          context: navigatorKey!.currentContext!,
          builder: (context) => ProviderArrivedModal(
            serviceId: serviceId.toString(),
            initialData: data,
          ),
        );
        return;
      }
    }
    */

    // Navigate to Tracking or Scheduled Service for other updates
    if (type == 'service_started' || type == 'service_completed' || type == 'status_update' || type == 'payment_approved') {
      final serviceId = data['id'] ?? data['service_id'];
      if (serviceId != null && navigatorKey?.currentContext != null) {
        final context = navigatorKey!.currentContext!;
        
        // Se já tivermos a info no payload, usamos. 
        // Senão, o ideal seria carregar, mas no tap do sistema (background)
        // podemos tentar carregar rapidamente ou ir para uma rota padrão.
        final locationType = data['location_type'];
        
        if (locationType == 'provider') {
           GoRouter.of(context).push('/scheduled-service/$serviceId');
        } else {
           GoRouter.of(context).push('/tracking/$serviceId');
        }
        return;
      }
    }
  }



  Future<void> showFromService(
    Map<String, dynamic> payload, {
    String? event,
  }) async {
    // Show local notification for service updates
    await _localNotifications.show(
      DateTime.now().millisecond,
      'Atualização de Serviço',
      payload['message'] ?? event ?? 'Nova atualização',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'service_updates',
          'Service Updates',
          importance: Importance.high,
          priority: Priority.high,
          largeIcon: DrawableResourceAndroidBitmap('ic_logo_colored'),
          sound: RawResourceAndroidNotificationSound('iphone_notificacao'),
        ),
      ),
      payload: jsonEncode(payload),
    );
  }

  Future<void> showAccepted() async {
    await _localNotifications.show(
      DateTime.now().millisecond,
      'Serviço Aceito!',
      'Um prestador aceitou seu serviço.',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'service_updates',
          'Service Updates',
          importance: Importance.high,
          priority: Priority.high,
          largeIcon: DrawableResourceAndroidBitmap('ic_logo_colored'),
          sound: RawResourceAndroidNotificationSound('iphone_notificacao'),
        ),
      ),
    );
  }

  Future<void> showNotification(String title, String body) async {
    await _localNotifications.show(
      DateTime.now().millisecond,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'high_importance_channel',
          'High Importance Notifications',
          importance: Importance.max,
          priority: Priority.high,
          icon: 'ic_notification_101',
          largeIcon: DrawableResourceAndroidBitmap('ic_logo_colored'),
          color: Colors.black,
          sound: RawResourceAndroidNotificationSound('iphone_notificacao'),
        ),
      ),
    );
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    final android = message.notification?.android;

    if (notification != null && android != null) {
      AndroidBitmap<Object>? largeIcon;
      // StyleInformation? styleInformation; // Uncomment if BigPicture is needed

      // Check for image URL in data or notification
      final String? imageUrl = message.data['image'] ?? android.imageUrl;

      if (imageUrl != null &&
          imageUrl.isNotEmpty &&
          imageUrl != 'null' &&
          imageUrl.trim().isNotEmpty) {
        try {
          final response = await http.get(Uri.parse(imageUrl));
          if (response.statusCode == 200) {
            largeIcon = ByteArrayAndroidBitmap(response.bodyBytes);
          }
        } catch (e) {
          debugPrint('Error downloading notification image: $e');
        }
      }

      // Fallback to local colored logo if no remote image
      largeIcon ??= const DrawableResourceAndroidBitmap('ic_logo_colored');

      await _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'high_importance_channel', // id
            'High Importance Notifications', // title
            channelDescription:
                'This channel is used for important notifications.',
            importance: Importance.max,
            priority: Priority.high,
            visibility: NotificationVisibility.public, // Show on lock screen
            icon: '@mipmap/launcher_icon', // Use the new small icon
            color: Colors.black, // Black theme
            largeIcon: largeIcon,
            sound: const RawResourceAndroidNotificationSound(
              'iphone_notificacao',
            ),
          ),
        ),
        payload: jsonEncode(message.data), // Pass full data for handling
      );
    }
  }
}
