import { useState } from 'react';
import axios from 'axios';

export default function Debug() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const testLogin = async () => {
    try {
      setResult('Testing login...');
      
      // Step 1: Login
      console.log('Attempting login...');
      const loginResponse = await axios({
        method: 'post',
        url: 'http://localhost:8000/login',
        data: {
          email,
          password
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Login response:', loginResponse.data);
      setResult(prev => prev + '\n✅ Login successful: ' + JSON.stringify(loginResponse.data, null, 2));
      
      const token = loginResponse.data.access_token;
      
      // Step 2: Test /me endpoint
      setResult(prev => prev + '\n\nTesting /me endpoint...');
      console.log('Testing /me with token:', token.substring(0, 20) + '...');
      
      const meResponse = await axios({
        method: 'get',
        url: 'http://localhost:8000/me',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Me response:', meResponse.data);
      setResult(prev => prev + '\n✅ /me successful: ' + JSON.stringify(meResponse.data, null, 2));
      
    } catch (error: any) {
      console.error('Full error:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Response headers:', error.response?.headers);
      
      setResult(prev => prev + `\n❌ Error: ${error.response?.status} - ${error.response?.data?.detail || error.message}`);
      setResult(prev => prev + `\n   Full error: ${JSON.stringify({
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      }, null, 2)}`);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Authentication</h1>
      
      <div className="space-y-4 mb-6">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button
          onClick={testLogin}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Login + /me
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-bold mb-2">Results:</h3>
        <pre className="whitespace-pre-wrap text-sm">{result}</pre>
      </div>
    </div>
  );
}