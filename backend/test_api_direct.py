"""
Test script to see the exact API response structure.
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_dashboard_output():
    """Get and print the full dashboard response."""
    
    # Login credentials - use 'email' field, not 'username'
    login_data = {
        "email": "adminr@supermarket.com",  # Changed from username to email
        "password": "Admin123!"
    }
    
    try:
        # Login - send as JSON
        login_response = requests.post(
            f"{BASE_URL}/auth/login",
            json=login_data
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print("Response:", login_response.text)
            return
        
        token_data = login_response.json()
        access_token = token_data.get("access_token")
        print(f"✅ Login successful!")
        print(f"Token: {access_token[:20]}...")
        
        # Get dashboard data
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(
            f"{BASE_URL}/market-data/dashboard",
            params={"time_range": "30d"},
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            
            print("\n" + "="*60)
            print("📊 FULL DASHBOARD RESPONSE")
            print("="*60)
            
            # Print the structure
            print("\n🔑 Top-level keys:")
            for key in data.keys():
                value = data[key]
                if isinstance(value, list):
                    print(f"  - {key}: list[{len(value)}]")
                elif isinstance(value, dict):
                    print(f"  - {key}: dict with keys {list(value.keys())}")
                else:
                    print(f"  - {key}: {type(value).__name__} = {value}")
            
            # Check trend_data
            print(f"\n📈 trend_data: {len(data.get('trend_data', []))} items")
            if data.get('trend_data'):
                print("  Sample first item:")
                for k, v in data['trend_data'][0].items():
                    print(f"    {k}: {v} ({type(v).__name__})")
            
            # Check top_competitors
            print(f"\n🏆 top_competitors: {len(data.get('top_competitors', []))} items")
            if data.get('top_competitors'):
                print("  Sample first competitor:")
                for k, v in data['top_competitors'][0].items():
                    print(f"    {k}: {v} ({type(v).__name__})")
            
            # Save full response to file for inspection
            with open('dashboard_response.json', 'w') as f:
                json.dump(data, f, indent=2, default=str)
            print("\n✅ Full response saved to dashboard_response.json")
            
        else:
            print(f"❌ Failed to get dashboard: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_dashboard_output()