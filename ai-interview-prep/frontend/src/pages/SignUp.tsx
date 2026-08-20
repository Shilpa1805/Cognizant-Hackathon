import { SignUp } from "@clerk/clerk-react";
import NavHeader from "../components/NavHeader";
import Footer from "../components/Footer";
import styles from "./AuthPage.module.css";

export default function SignUpPage() {
  return (
    <div className={styles.authContainer}>
      <NavHeader />
      <main className={styles.main} style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <SignUp routing="path" path="/signup" signInUrl="/login" />
      </main>
      <Footer />
    </div>
  );
}
