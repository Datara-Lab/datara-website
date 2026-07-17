import LoginForm from "../../components/login/LoginForm";
import LoginLeftPanel from "../../components/login/LoginLeftPanel";

export default function LoginPage() {
  return (
    <main className="flex h-screen min-h-[720px] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-white to-cyan-50 p-3">
      <div className="grid h-[calc(100vh-24px)] max-h-[900px] min-h-[690px] w-full max-w-[1500px] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-blue-950/10 lg:grid-cols-2">
        <LoginLeftPanel />
        <LoginForm />
      </div>
    </main>
  );
}