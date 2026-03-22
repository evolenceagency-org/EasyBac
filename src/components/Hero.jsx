import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './Navbar.jsx'
import Hero3D from './Hero3D'

const container = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut', staggerChildren: 0.12 }
  }
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
}

const Hero = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const handleChange = (event) => {
      setIsMobile(event.matches)
      setVideoLoaded(false)
      setVideoFailed(false)
    }
    handleChange(media)
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  const source = isMobile ? '/hero-video-mobile.mp4' : '/hero-video-desktop.mp4'

  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center">
      <Navbar />

      <img
        src="/assets/images/hero-study-fallback-dark.png"
        alt="Study workspace background"
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />

      <video
        key={source}
        className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-700 ${
          videoLoaded && !videoFailed ? 'opacity-100' : 'opacity-0'
        }`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setVideoLoaded(true)}
        onError={() => setVideoFailed(true)}
      >
        <source src={source} type="video/mp4" />
      </video>

      <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/35 to-black/75" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-black via-transparent to-black opacity-60" />
      <div className="pointer-events-none absolute -left-36 top-24 z-10 h-80 w-80 rounded-full bg-purple-500/25 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 z-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-20 mx-auto w-full max-w-7xl px-6 lg:px-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative z-20 space-y-6 text-center lg:max-w-xl lg:text-left"
          >
          <motion.p variants={item} className="text-xs uppercase tracking-[0.35em] text-white/65">
            PREMIUM BAC PREPARATION
          </motion.p>

          <motion.h1
            variants={item}
            className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Master your{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Baccalaureate
            </span>
            .
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto max-w-xl text-sm text-white/75 sm:text-base md:mx-0 md:text-lg"
          >
            Build deep study habits, stay consistent, and improve your performance with a
            clear plan every day.
          </motion.p>

          <motion.div
            variants={item}
            className="flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <Link
              to="/login"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/10"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all duration-300 hover:scale-105"
            >
              Register
            </Link>
          </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
            className="relative z-10 hidden w-full items-center justify-center lg:flex"
          >
            <div className="relative flex h-[570px] w-full items-center justify-center overflow-visible">
              <div className="relative w-full max-w-[820px] -translate-x-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_40px_120px_rgba(0,0,0,0.6)] lg:-translate-x-8 xl:-translate-x-10">
                <div className="pointer-events-none absolute -bottom-10 left-1/2 z-0 h-[60px] w-[70%] -translate-x-1/2 rounded-full bg-purple-500/30 blur-[60px]" />
                <div className="relative z-10">
                  <Hero3D />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-8 lg:hidden">
          <img
            src="/assets/images/hero-study-fallback-dark.png"
            alt="Study workspace background"
            className="w-full max-h-[260px] rounded-2xl border border-white/10 bg-white/5 object-cover shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          />
        </div>
      </div>
    </section>
  )
}

export default Hero
