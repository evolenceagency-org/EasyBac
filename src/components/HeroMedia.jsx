import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const HeroMedia = () => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  )
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const handleChange = (event) => setIsDesktop(event.matches)
    handleChange(media)
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  const videoSrc = isDesktop ? '/demo-desktop.mp4' : '/demo-mobile.mp4'

  return (
    <div className="relative w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_40px_rgba(59,130,246,0.25)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -inset-4 rounded-[32px] bg-gradient-to-b from-purple-500/20 via-blue-500/20 to-transparent blur-2xl" />

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-black/40">
        <img
          src="/hero-3d.png"
          alt="BacTracker preview"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            videoReady && !videoError ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
        />
        <motion.video
          key={videoSrc}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoError(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: videoReady && !videoError ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        >
          <source src={videoSrc} type="video/mp4" />
        </motion.video>
      </div>
    </div>
  )
}

export default HeroMedia
