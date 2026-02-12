import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ListingDetail from './pages/ListingDetail';
import MyBookings from './pages/MyBookings';
import Dashboard from './pages/dashboard/Dashboard';
import CreateListing from './pages/dashboard/CreateListing';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="listings/:id" element={<ListingDetail />} />
        <Route path="my-bookings" element={<MyBookings />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard/create-listing" element={<CreateListing />} />
      </Route>
    </Routes>
  );
}

export default App;
