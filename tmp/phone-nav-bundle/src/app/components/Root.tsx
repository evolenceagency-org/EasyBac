import { Outlet } from "react-router";
import { BottomNav } from "./BottomNav";

export function Root() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <main className="pb-32">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
