import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useTheme } from "../contexts/ThemeContext";

const Layout = () => {
  const { sidebarCollapsed } = useTheme();

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        }`}
      >
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
