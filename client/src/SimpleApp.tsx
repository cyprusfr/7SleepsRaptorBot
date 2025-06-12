import { useState } from "react";

function SimpleApp() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '400px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '16px', color: '#1f2937' }}>
          Simple Test App
        </h1>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          If you can see this, React is working properly.
        </p>
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          Count: {count}
        </button>
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            Clear Storage & Reload
          </button>
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go to Main App
          </button>
        </div>
        <div style={{ 
          marginTop: '16px', 
          fontSize: '12px', 
          color: '#9ca3af',
          textAlign: 'left',
          backgroundColor: '#f9fafb',
          padding: '8px',
          borderRadius: '4px'
        }}>
          <strong>Debug Info:</strong><br/>
          URL: {window.location.href}<br/>
          Storage Test: {(() => {
            try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              return 'PASS';
            } catch (e: any) {
              return `FAIL: ${e.message}`;
            }
          })()}
        </div>
      </div>
    </div>
  );
}

export default SimpleApp;