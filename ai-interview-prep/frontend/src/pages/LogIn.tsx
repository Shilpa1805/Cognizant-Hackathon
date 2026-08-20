import { SignIn } from "@clerk/clerk-react";
import NavHeader from "../components/NavHeader";
import Footer from "../components/Footer";
import styles from "./AuthPage.module.css";

export default function LogIn() {
  return (
    <div className={styles.authContainer}>
      <NavHeader />
      <main className={styles.main} style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <SignIn routing="path" path="/login" signUpUrl="/signup" />
      </main>
      <Footer />
    </div>
  );
}
