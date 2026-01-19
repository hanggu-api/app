import 'package:flutter/material.dart';
import 'provider_profile_content.dart';

class ProviderProfileScreen extends StatelessWidget {
  const ProviderProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: const ProviderProfileContent(),
    );
  }
}
