import { useNavigate } from "react-router"
import { useState } from "react";
import {registerApi} from "../../api/authApi"


export function RegisterPage() {

  const navigate = useNavigate(); 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

 
  async function handleRegister(e) {
    e.preventDefault(); 

    if (loading) return;

    setLoading(true);
    setError("");

    try{
      await registerApi({email,password,firstname,lastname});
      navigate("/login");
    }catch(e){
      console.log(e);
      setError(e);
    }finally{
      setLoading(false)
    }

  }



  return (
    <div className="login-container">

      <form className="login-card" onSubmit={handleRegister}>

        <h2>Register</h2>

        {error && <p className="error">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="First Name"
          value={firstname}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Last Name"
          value={lastname}
          onChange={(e) => setLastName(e.target.value)}
          required
        />

        <button
          className="register-btn"
          type="submit"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <button
          type="button"
          className="homepage-btn"
          onClick={() => navigate("/")}
        >
          View Products Instead
        </button>

      </form>

    </div>
  );
}