import { useState } from "react";
import {useNavigate} from "react-router"
import "../styles/login-page.css"
import {loginApi} from "../api/authApi"
import { useAuth } from "../auth/AuthContext";


export function LoginPage(){
 const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  

  const navigate = useNavigate();
  const {login} = useAuth();
  
  

  async function handleSubmit(e) {
    e.preventDefault();

   try{
    const data = await loginApi({email,password});
    console.log("login success",data);
    login(data.accessToken,data.refreshToken,data.userId);
    navigate("/")
   }catch(e){
     console.log("login Failed",e);
     setLoginError("Invalid Username or Password");
   }

  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Login</h2>

        {loginError && <p className="error">{loginError}</p>}

        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className = "login-btn"type="submit">Login</button>

        <button className="register-btn" type="button"
        onClick={()=> navigate("/register")}>
          Register
        </button>

      </form>
    </div>
  );


}