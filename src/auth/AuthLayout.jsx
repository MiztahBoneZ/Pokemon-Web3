// src/components/auth/AuthLayout.jsx
import "./AuthLayout.css";

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-container">
      <h1>{title}</h1>
      <h2>{subtitle}</h2>
      {children}
    </div>
  );
}

export default AuthLayout;
