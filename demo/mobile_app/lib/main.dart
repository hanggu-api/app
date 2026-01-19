import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'features/agency/screens/agency_home_screen.dart';
import 'features/agency/screens/agency_onboarding_screen.dart';
import 'features/agency/screens/agency_public_profile_screen.dart';
import 'features/agency/screens/create_campaign_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/client/client_settings_screen.dart';
import 'features/client/confirmation_screen.dart';
import 'features/client/my_services_screen.dart';
import 'features/client/payment_screen.dart';
import 'features/client/service_request_screen.dart';
import 'features/client/refund_request_screen.dart';
import 'features/client/scheduled_service_screen.dart';
import 'features/client/service_verification_screen.dart';
import 'features/client/tracking_screen.dart';
import 'features/common/review_screen.dart';
import 'features/dev/simulation_screen.dart';
import 'features/home/home_screen.dart';
import 'features/provider/edit_request_screen.dart';
import 'features/provider/finish_service_screen.dart';
import 'features/provider/medical_home_screen.dart';
import 'features/provider/provider_home_screen.dart';
import 'features/provider/provider_profile_screen.dart';
import 'features/provider/provider_schedule_settings_screen.dart';
import 'features/provider/service_details_screen_fixed.dart';
import 'features/shared/chat_list_screen.dart';
import 'features/shared/chat_screen.dart';
import 'features/shared/notification_screen.dart';
import 'features/shared/warranty_screen.dart';
import 'firebase_options.dart';
import 'services/api_service.dart';
import 'services/notification_service.dart';
import 'services/remote_config_service.dart';
import 'services/theme_service.dart';
import 'widgets/scaffold_with_nav_bar.dart';
import 'core/utils/logger.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  debugPrint = customDebugPrint;
  usePathUrlStrategy();
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    await initializeDateFormatting('pt_BR', null);

    if (!kIsWeb) {
      // Initialize Analytics to log app open and prevent "library missing" warning
      try {
        await FirebaseAnalytics.instance.logAppOpen();
      } catch (e) {
        // Ignore analytics errors in debug/dev
        debugPrint('Analytics init error: $e');
      }
    }

    // Initialize background service
    /*
    if (!kIsWeb) {
      await initializeBackgroundService();
    }
    */

    // Configurar Crashlytics
    if (!kIsWeb) {
      // Pass all uncaught "fatal" errors from the framework to Crashlytics
      FlutterError.onError =
          FirebaseCrashlytics.instance.recordFlutterFatalError;

      // Pass all uncaught asynchronous errors that aren't handled by the Flutter framework to Crashlytics
      PlatformDispatcher.instance.onError = (error, stack) {
        FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
        return true;
      };
    }
  } catch (e) {
    debugPrint('Initialization error: $e');
  }

  // Debug: Show errors on screen
  ErrorWidget.builder = (FlutterErrorDetails details) {
    return MaterialApp(
      home: Scaffold(
        backgroundColor: Colors.red.shade100,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error, color: Colors.red, size: 48),
                  const SizedBox(height: 16),
                  Text(
                    'Erro na Aplicação',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.red.shade900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    details.exceptionAsString(),
                    style: const TextStyle(color: Colors.black87),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  };

  runApp(const ProviderScope(child: AppBootstrapper()));
}

class AppBootstrapper extends StatefulWidget {
  const AppBootstrapper({super.key});

  @override
  State<AppBootstrapper> createState() => _AppBootstrapperState();
}

class _AppBootstrapperState extends State<AppBootstrapper> {
  bool _initialized = false;
  String? _error;
  String _initialLocation = '/login';

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      // 1. Jailbreak Detection (Enterprise Security)
      /*
      bool isJailbroken = false;
      try {
        isJailbroken = await FlutterJailbreakDetection.jailbroken;
        if (isJailbroken && !kDebugMode) {
          setState(() {
            _error =
                "Dispositivo comprometido detectado (Root/Jailbreak). Por segurança, o acesso é restrito.";
          });
          return;
        }
      } catch (e) {
        debugPrint('Jailbreak detection error: $e');
      }
      */

      // 2. Inicializa serviços
      try {
        await RemoteConfigService().initialize();
        NotificationService().init(navigatorKey);
        await ThemeService().loadTheme();
      } catch (e) {
        debugPrint('Warning: NotificationService/Theme init failed: $e');
      }

      final api = ApiService();
      // await api.loadConfig(); // Method removed/not needed
      await api.loadToken();

      // 3. Robust Authentication Check
      final currentUser = FirebaseAuth.instance.currentUser;
      final prefs = await SharedPreferences.getInstance();
      final role = prefs.getString('user_role');

      if (role != null) {
        ThemeService().setProviderMode(role == 'provider');
      }

      if (mounted) {
        setState(() {
          if (currentUser == null) {
            _initialLocation = '/login';
          } else if (role == null) {
            _initialLocation = '/login';
          } else {
            _initialLocation = role == 'provider'
                ? (api.isMedical ? '/medical-home' : '/provider-home')
                : '/home';
          }
          _initialized = true;
        });

        // REFRESH PROFILE ASYNC (to sync flags like isMedical/isFixedLocation)
        if (currentUser != null && role != null) {
          api.getMyProfile().then((_) {
            // Update initial location if flags changed
            if (mounted) {
              setState(() {
                _initialLocation = role == 'provider'
                    ? (api.isMedical ? '/medical-home' : '/provider-home')
                    : '/home';
              });
            }
          }).catchError((e) {
            debugPrint('Profile refresh failed: $e');
            return null;
          });
        }
      }

      // Ensure FCM token is synced after login
      if (currentUser != null) {
        try {
          await NotificationService().syncToken();
        } catch (e) {
          debugPrint('Error syncing FCM token: $e');
        }
      }
    } catch (e, stack) {
      debugPrint('Erro fatal ao inicializar app: $e\n$stack');
      if (mounted) {
        setState(() {
          _error = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 48),
                  const SizedBox(height: 16),
                  const Text(
                    'Erro de Segurança ou Inicialização',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(_error!, textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _error = null;
                        _initialized = false;
                      });
                      _init();
                    },
                    child: const Text('Tentar Novamente'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    if (!_initialized) {
      return const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: SplashScreen(),
      );
    }

    return MyApp(initialLocation: _initialLocation);
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class MyApp extends StatelessWidget {
  final String initialLocation;
  const MyApp({super.key, this.initialLocation = '/login'});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeService(),
      builder: (context, child) {
        return MaterialApp.router(
          title: '101 Service',
          theme: ThemeService().currentThemeData,
          routerConfig: _buildRouter(initialLocation),
          debugShowCheckedModeBanner: false,
          locale: const Locale('pt', 'BR'),
          supportedLocales: const [Locale('pt', 'BR')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
        );
      },
    );
  }
}

GoRouter _buildRouter(String initialLocation) => GoRouter(
  navigatorKey: navigatorKey,
  initialLocation: initialLocation,
  redirect: (context, state) {
    final api = ApiService();
    final logged = api.isLoggedIn;
    final loggingIn = state.matchedLocation == '/login';
    final registering = state.matchedLocation == '/register';
    final simulating = state.matchedLocation == '/simulation';
    if (!logged && !loggingIn && !registering && !simulating) {
      return '/login';
    }
    if (logged && loggingIn) {
      if (api.role == 'provider') {
        ThemeService().setProviderMode(true);
        return api.isMedical ? '/medical-home' : '/provider-home';
      }
      ThemeService().setProviderMode(false);
      return '/home';
    }
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
      path: '/register',
      builder: (context, state) {
        final role = state.extra as String?;
        return RegisterScreen(initialRole: role);
      },
    ),
    ShellRoute(
      builder: (context, state, child) => ScaffoldWithNavBar(child: child),
      routes: [
        GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
        GoRoute(
          path: '/chats',
          builder: (context, state) => const ChatListScreen(),
        ),
        GoRoute(
          path: '/client-settings',
          builder: (context, state) => const ClientSettingsScreen(),
        ),
        GoRoute(
          path: '/provider-settings',
          builder: (context, state) => const ClientSettingsScreen(),
        ),
        GoRoute(
          path: '/tracking/:serviceId',
          builder: (context, state) => TrackingScreen(
            serviceId: state.pathParameters['serviceId'] ?? '',
          ),
        ),
        GoRoute(
          path: '/scheduled-service/:serviceId',
          builder: (context, state) => ScheduledServiceScreen(
            serviceId: state.pathParameters['serviceId'] ?? '',
          ),
        ),
        GoRoute(
          path: '/provider-home',
          builder: (context, state) => const ProviderHomeScreen(),
        ),
        GoRoute(
          path: '/medical-home',
          builder: (context, state) => const MedicalHomeScreen(),
        ),
        GoRoute(
          path: '/provider-profile',
          builder: (context, state) => const ProviderProfileScreen(),
        ),
        GoRoute(
          path: '/my-services',
          builder: (context, state) => const MyServicesScreen(),
        ),
        GoRoute(
          path: '/payment/:serviceId',
          builder: (context, state) {
            final extra = state.extra;
            if (extra != null) {
              return PaymentScreen(extraData: extra);
            }
            return PaymentScreen(extraData: state.pathParameters['serviceId']);
          },
        ),
        GoRoute(
          path: '/confirmation',
          builder: (context, state) => const ConfirmationScreen(),
        ),
        GoRoute(
          path: '/warranty',
          builder: (context, state) => const WarrantyScreen(),
        ),
        // Helper route for notifications to dispatch based on role
        GoRoute(
          path: '/service-details',
          redirect: (context, state) {
            final api = ApiService();
            final extra = state.extra;
            final serviceId = extra is String
                ? extra
                : (extra as Map?)?['id']?.toString();

            if (serviceId == null) return '/home';

            if (api.role == 'provider') {
              return '/provider-service-details/$serviceId';
            } else {
              return '/tracking/$serviceId';
            }
          },
        ),
        GoRoute(
          path: '/provider-service-details/:serviceId',
          builder: (context, state) {
            final serviceId = state.pathParameters['serviceId'] ?? '';
            return ServiceDetailsScreen(serviceId: serviceId);
          },
        ),
        GoRoute(
          path: '/provider-service-finish/:serviceId',
          builder: (context, state) {
            final serviceId = state.pathParameters['serviceId'] ?? '';
            return FinishServiceScreen(serviceId: serviceId);
          },
        ),
        GoRoute(
          path: '/notifications',
          builder: (context, state) => const NotificationScreen(),
        ),
        GoRoute(
          path: '/service-verification/:serviceId',
          builder: (context, state) => ServiceVerificationScreen(
            serviceId: state.pathParameters['serviceId'] ?? '',
          ),
        ),
        GoRoute(
          path: '/refund-request',
          builder: (context, state) {
            final extra = state.extra as Map<String, dynamic>? ?? {};
            return RefundRequestScreen(
              serviceId: extra['id']?.toString() ?? '',
              title: extra['title']?.toString() ?? 'Solicitar Devolução',
            );
          },
        ),
      ],
    ),
    GoRoute(
      path: '/create-service',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return ServiceRequestScreen(
          initialProviderId: extra?['providerId'],
          initialService: extra?['service'],
        );
      },
    ),
    GoRoute(
      path: '/service-edit-request',
      builder: (context, state) =>
          EditRequestScreen(serviceId: state.extra as String),
    ),
    GoRoute(
      path: '/chat',
      builder: (context, state) => ChatScreen(serviceId: state.extra as String),
    ),
    GoRoute(
      path: '/simulation',
      builder: (context, state) => const SimulationScreen(),
    ),
    GoRoute(
      path: '/agency',
      builder: (context, state) => const AgencyHomeScreen(),
    ),
    GoRoute(
      path: '/agency/onboarding',
      builder: (context, state) => const AgencyOnboardingScreen(),
    ),
    GoRoute(
      path: '/agency/create-campaign',
      builder: (context, state) => const CreateCampaignScreen(),
    ),
    GoRoute(
      path: '/agency/profile/:id',
      builder: (context, state) =>
          AgencyPublicProfileScreen(userId: state.pathParameters['id'] ?? 'me'),
    ),
    GoRoute(
      path: '/review/:serviceId',
      builder: (context, state) {
        final serviceId = state.pathParameters['serviceId']!;
        return ReviewScreen(serviceId: serviceId);
      },
    ),
    GoRoute(
      path: '/provider-schedule-settings',
      builder: (context, state) => const ProviderScheduleSettingsScreen(),
    ),
  ],
);
