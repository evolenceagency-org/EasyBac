import React from 'react'

const Hero3D = () => {
  return (
    <div className="relative w-full max-w-[800px] h-auto perspective-container overflow-visible">
      <div className="aspect-[16/10] w-full">
        <div className="dashboard-mockup hero3d-shell relative w-full h-full rounded-2xl border border-white/10 bg-[#141b2d] shadow-[0_40px_100px_rgba(0,0,0,0.5),0_20px_40px_rgba(139,92,246,0.12)] inner-light-leak overflow-visible">
          <div className="absolute inset-0 rounded-2xl border border-white/5 pointer-events-none" />
          <div className="hero3d-glow absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-tr from-purple-500/25 via-blue-400/10 to-cyan-400/15 blur-3xl" />

          <div className="hero3d-rail absolute left-6 top-6 flex h-[calc(100%-48px)] w-14 flex-col items-center gap-5 rounded-xl bg-white/5 py-4 text-white/70">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-200">
              <span className="material-symbols-outlined text-base">school</span>
            </div>
            <span className="material-symbols-outlined text-sm">grid_view</span>
            <span className="material-symbols-outlined text-sm">insights</span>
            <span className="material-symbols-outlined text-sm">timer</span>
            <span className="material-symbols-outlined text-sm">menu_book</span>
            <span className="material-symbols-outlined text-sm mt-auto mb-1">deployed_code</span>
          </div>

          <div className="ml-24 mr-[230px] mt-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Dashboard Overview</p>
            <h3 className="hero3d-title mt-2 text-[34px] leading-[1.05] font-semibold tracking-tight text-white">
              BacTracker Focus
            </h3>

            <div className="mt-8 grid max-w-[360px] grid-cols-3 gap-3">
              <div className="hero3d-stat rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                  <span className="material-symbols-outlined text-sm text-white/80">schedule</span>
                </div>
                <p className="text-4xl leading-none font-semibold text-white">14</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/55">Total Study</p>
              </div>
              <div className="hero3d-stat rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                  <span className="material-symbols-outlined text-sm text-white/80">
                    local_fire_department
                  </span>
                </div>
                <p className="text-4xl leading-none font-semibold text-white">12</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/55">Streak</p>
              </div>
              <div className="hero3d-stat hero3d-stat-feature rounded-xl border border-purple-300/30 bg-gradient-to-br from-purple-400/70 to-purple-600/80 p-3 text-center shadow-[0_20px_45px_rgba(111,66,193,0.45)]">
                <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                  <span className="material-symbols-outlined text-sm text-white">hourglass_top</span>
                </div>
                <p className="text-4xl leading-none font-semibold text-white">42</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/85">Days Left</p>
              </div>
            </div>
          </div>

          <div className="hero3d-float hero3d-float-top absolute -top-4 right-2 w-52 rounded-2xl border border-white/10 bg-[#1d2740]/90 px-4 py-3 text-white shadow-[0_15px_40px_rgba(0,0,0,0.3)] backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/55">Current Mode</p>
            <p className="mt-2 flex items-center gap-2 text-[20px] leading-none font-semibold whitespace-nowrap">
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              Deep Work
            </p>
          </div>

          <div className="hero3d-float hero3d-float-mid absolute top-24 right-10 w-44 rounded-xl border border-white/10 bg-[#27304a]/85 px-4 py-3 text-white shadow-[0_15px_40px_rgba(0,0,0,0.22)] backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/55">Target Date</p>
            <p className="mt-1 text-[20px] leading-none tracking-tight font-semibold whitespace-nowrap">
              June 4, 2026
            </p>
          </div>

          <div className="hero3d-float hero3d-float-bottom absolute bottom-4 left-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1f2942]/90 px-4 py-3 text-white shadow-[0_20px_40px_rgba(0,0,0,0.3)] backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/25 text-emerald-300">
              <span className="material-symbols-outlined text-base">check_circle</span>
            </div>
            <div>
              <p className="text-sm leading-tight font-semibold whitespace-nowrap">Session Complete</p>
              <p className="text-[11px] text-white/60 whitespace-nowrap">+25 Focus Points Earned</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Hero3D
