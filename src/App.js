import logo from './logo.svg';
import './App.css';
import DataVisualization from './DataVisualization';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Data Labeler
        </p>
        <DataVisualization />
      </header>
    </div>
  );
}

export default App;
