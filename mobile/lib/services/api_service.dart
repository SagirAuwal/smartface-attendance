import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String _defaultUrl = "https://sageerbh-smartface-backend.hf.space"; // Production backend URL
  
  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('smartface_base_url') ?? _defaultUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    // Trim trailing slash if present
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://$url';
    }
    await prefs.setString('smartface_base_url', url);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('smartface_token');
  }

  static Future<Map<String, dynamic>?> getCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('smartface_user');
    if (userStr == null) return null;
    try {
      return json.decode(userStr) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/auth/login');
    
    final request = http.MultipartRequest('POST', url)
      ..fields['username'] = email
      ..fields['password'] = password;
      
    final streamedResponse = await request.send().timeout(const Duration(seconds: 10));
    final response = await http.Response.fromStream(streamedResponse);
    
    if (response.statusCode != 200) {
      try {
        final err = json.decode(response.body);
        throw Exception(err['detail'] ?? 'Invalid credentials');
      } catch (_) {
        throw Exception('Connection failed. Verify server URL/IP.');
      }
    }
    
    final data = json.decode(response.body) as Map<String, dynamic>;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('smartface_token', data['access_token']);
    await prefs.setString('smartface_user', json.encode(data['user']));
    
    return data;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('smartface_token');
    await prefs.remove('smartface_user');
  }

  static Future<List<Map<String, dynamic>>> getCourses() async {
    final baseUrl = await getBaseUrl();
    final token = await getToken();
    final url = Uri.parse('$baseUrl/api/courses');
    
    final response = await http.get(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    
    if (response.statusCode != 200) {
      throw Exception('Failed to load courses roster');
    }
    
    final List<dynamic> list = json.decode(response.body);
    return list.map((item) => item as Map<String, dynamic>).toList();
  }

  static Future<Map<String, dynamic>> markAttendance({
    required int courseId,
    required Uint8List imageBytes,
  }) async {
    final baseUrl = await getBaseUrl();
    final token = await getToken();
    final url = Uri.parse('$baseUrl/api/attendance/mark');
    
    final request = http.MultipartRequest('POST', url)
      ..headers['Authorization'] = 'Bearer $token'
      ..fields['course_id'] = courseId.toString()
      ..files.add(http.MultipartFile.fromBytes(
        'file',
        imageBytes,
        filename: 'scan.jpg',
      ));
      
    final streamedResponse = await request.send().timeout(const Duration(seconds: 15));
    final response = await http.Response.fromStream(streamedResponse);
    
    if (response.statusCode != 200 && response.statusCode != 404) {
      throw Exception('Server biometric analysis error');
    }
    
    final data = json.decode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 404) {
      // Return identified status as failed directly inside payload
      return {
        'status': 'error',
        'message': data['detail'] ?? 'Face not recognized.',
      };
    }
    
    return data;
  }
}
