import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Fingerprint from "./pages/Fingerprint";
import PrivacyCheck from "./pages/PrivacyCheck";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fingerprint" element={<Fingerprint />} />
        <Route path="/privacy" element={<PrivacyCheck />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
} 