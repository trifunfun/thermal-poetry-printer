import React, { useState } from 'react';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [printer, setPrinter] = useState(null);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [textType, setTextType] = useState('poem');
  const [theme, setTheme] = useState('general');
  const [apiKey, setApiKey] = useState('');

  // Check if Web Bluetooth is supported
  const isBluetoothSupported = 'bluetooth' in navigator;

  const connectToPrinter = async () => {
    try {
      if (!isBluetoothSupported) {
        alert('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
        return;
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          {
            services: ['000018f0-0000-1000-8000-00805f9b34fb'] // Common printer service UUID
          },
          {
            namePrefix: 'Phomemo'
          },
          {
            namePrefix: 'M02'
          }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      setPrinter({ device, server, service, characteristic });
      setIsConnected(true);
      alert('Successfully connected to printer!');
    } catch (error) {
      console.error('Error connecting to printer:', error);
      alert('Failed to connect to printer. Please make sure your Phomemo M02 is turned on and in pairing mode.');
    }
  };

  const disconnectFromPrinter = () => {
    if (printer && printer.server) {
      printer.server.disconnect();
    }
    setPrinter(null);
    setIsConnected(false);
  };

  const generateText = async () => {
    if (!apiKey) {
      alert('Please enter your OpenAI API key first.');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = textType === 'poem' 
        ? `Write a short, creative ${theme} poem (4-8 lines) that would be perfect for printing on a thermal printer receipt. Make it uplifting and party-appropriate.`
        : `Write a fun, positive fortune (1-2 sentences) with a ${theme} theme that would be perfect for printing on a thermal printer receipt. Make it entertaining and party-appropriate.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a creative poet and fortune teller. Generate short, engaging content perfect for thermal printer receipts.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.8
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        setGeneratedText(data.choices[0].message.content.trim());
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('Error generating text:', error);
      alert('Failed to generate text. Please check your API key and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const printText = async () => {
    if (!printer || !generatedText) {
      alert('Please connect to a printer and generate some text first.');
      return;
    }

    setIsPrinting(true);
    try {
      // ESC/POS commands for thermal printer
      const commands = [
        0x1B, 0x40, // Initialize printer
        0x1B, 0x61, 0x01, // Center alignment
        0x1B, 0x21, 0x10, // Double height and width
        ...new TextEncoder().encode('✨ ' + textType.toUpperCase() + ' ✨\n'),
        0x1B, 0x21, 0x00, // Normal size
        0x1B, 0x61, 0x01, // Center alignment
        ...new TextEncoder().encode('\n'),
        ...new TextEncoder().encode(generatedText),
        ...new TextEncoder().encode('\n\n'),
        0x1B, 0x61, 0x01, // Center alignment
        ...new TextEncoder().encode('🎉 Enjoy your party! 🎉\n'),
        ...new TextEncoder().encode('\n\n\n\n'), // Feed paper
        0x1B, 0x69 // Cut paper
      ];

      const characteristic = printer.characteristic;
      await characteristic.writeValue(new Uint8Array(commands));
      
      alert('Printed successfully!');
    } catch (error) {
      console.error('Error printing:', error);
      alert('Failed to print. Please check your printer connection.');
    } finally {
      setIsPrinting(false);
    }
  };

  const printTestPage = async () => {
    if (!printer) {
      alert('Please connect to a printer first.');
      return;
    }

    setIsPrinting(true);
    try {
      const testText = `🎉 THERMAL POETRY PRINTER 🎉

This is a test print to verify
your printer connection is working!

✨ Features:
• AI-generated poems
• Custom fortunes
• Party-ready content
• Easy printing

Enjoy your party! 🎊

`;
      
      const commands = [
        0x1B, 0x40, // Initialize printer
        0x1B, 0x61, 0x01, // Center alignment
        0x1B, 0x21, 0x10, // Double height and width
        ...new TextEncoder().encode('🎉 THERMAL POETRY PRINTER 🎉\n'),
        0x1B, 0x21, 0x00, // Normal size
        0x1B, 0x61, 0x00, // Left alignment
        ...new TextEncoder().encode('\n'),
        ...new TextEncoder().encode(testText),
        0x1B, 0x61, 0x01, // Center alignment
        ...new TextEncoder().encode('Test completed! ✨\n'),
        ...new TextEncoder().encode('\n\n\n\n'), // Feed paper
        0x1B, 0x69 // Cut paper
      ];

      const characteristic = printer.characteristic;
      await characteristic.writeValue(new Uint8Array(commands));
      
      alert('Test page printed successfully!');
    } catch (error) {
      console.error('Error printing test page:', error);
      alert('Failed to print test page. Please check your printer connection.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🎉 Thermal Poetry Printer</h1>
          <p>Generate and print AI-powered poems & fortunes for your party!</p>
        </header>

        <div className="main-content">
          {/* API Key Section */}
          <div className="section">
            <h2>🔑 OpenAI API Key</h2>
            <p>Enter your OpenAI API key to generate AI content:</p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="api-key-input"
            />
            <small>
              Get your API key from{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                OpenAI Platform
              </a>
            </small>
          </div>

          {/* Printer Connection Section */}
          <div className="section">
            <h2>🖨️ Printer Connection</h2>
            <div className="printer-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
              {isBluetoothSupported ? (
                <div className="printer-controls">
                  {!isConnected ? (
                    <button onClick={connectToPrinter} className="btn btn-primary">
                      🔗 Connect to Phomemo M02
                    </button>
                  ) : (
                    <div className="connected-controls">
                      <button onClick={printTestPage} className="btn btn-secondary" disabled={isPrinting}>
                        {isPrinting ? '🔄 Printing...' : '🧪 Print Test Page'}
                      </button>
                      <button onClick={disconnectFromPrinter} className="btn btn-danger">
                        ❌ Disconnect
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="error">❌ Web Bluetooth not supported. Please use Chrome or Edge browser.</p>
              )}
            </div>
          </div>

          {/* Content Generation Section */}
          <div className="section">
            <h2>✨ Generate Content</h2>
            <div className="generation-controls">
              <div className="control-group">
                <label>Content Type:</label>
                <select value={textType} onChange={(e) => setTextType(e.target.value)} className="select-input">
                  <option value="poem">📝 Poem</option>
                  <option value="fortune">🔮 Fortune</option>
                </select>
              </div>
              
              <div className="control-group">
                <label>Theme:</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value)} className="select-input">
                  <option value="general">🎉 General</option>
                  <option value="love">💕 Love</option>
                  <option value="friendship">👥 Friendship</option>
                  <option value="success">🏆 Success</option>
                  <option value="adventure">🗺️ Adventure</option>
                  <option value="humor">😄 Humor</option>
                </select>
              </div>

              <button 
                onClick={generateText} 
                className="btn btn-primary" 
                disabled={isGenerating || !apiKey}
              >
                {isGenerating ? '🔄 Generating...' : '✨ Generate Content'}
              </button>
            </div>
          </div>

          {/* Generated Content Section */}
          {generatedText && (
            <div className="section">
              <h2>📄 Generated Content</h2>
              <div className="generated-content">
                <div className="content-preview">
                  <h3>✨ {textType.charAt(0).toUpperCase() + textType.slice(1)} ✨</h3>
                  <p>{generatedText}</p>
                </div>
                <button 
                  onClick={printText} 
                  className="btn btn-success" 
                  disabled={!isConnected || isPrinting}
                >
                  {isPrinting ? '🔄 Printing...' : '🖨️ Print Now'}
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="footer">
          <p>🎊 Perfect for parties, events, and spreading joy! 🎊</p>
          <small>Compatible with Phomemo M02 and other thermal printers</small>
        </footer>
      </div>
    </div>
  );
}

export default App;
