import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import SecurityRules from './pages/SecurityRules';
import Goals from './pages/Goals';
import ActivityLog from './pages/ActivityLog';
import Performance from './pages/Performance';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/rules" element={<SecurityRules />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/activity" element={<ActivityLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
