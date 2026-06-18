import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Hero3D() {
    const mountRef = useRef(null)

    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return
        const W = mount.clientWidth
        const H = mount.clientHeight

        /* ── Renderer ─────────────────────────────── */
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(W, H)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x000000, 0)
        renderer.shadowMap.enabled = true
        mount.appendChild(renderer.domElement)

        /* ── Scene & Camera ───────────────────────── */
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100)
        camera.position.set(0, 0, 14)

        /* ── Lights ───────────────────────────────── */
        scene.add(new THREE.AmbientLight(0xffffff, 0.4))
        const gold1 = new THREE.PointLight(0xC9A84C, 3, 25)
        gold1.position.set(6, 4, 6)
        scene.add(gold1)
        const purple1 = new THREE.PointLight(0x7B52C0, 2, 20)
        purple1.position.set(-6, -3, 4)
        scene.add(purple1)
        const rim = new THREE.DirectionalLight(0xF0D080, 0.5)
        rim.position.set(0, 8, -5)
        scene.add(rim)

        /* ── Shared materials ─────────────────────── */
        const goldWireMat = new THREE.MeshBasicMaterial({ color: 0xC9A84C, wireframe: true, transparent: true, opacity: 0.25 })
        const goldSolidMat = new THREE.MeshStandardMaterial({ color: 0xC9A84C, metalness: 0.95, roughness: 0.05, transparent: true, opacity: 0.15 })
        const purpleWireMat = new THREE.MeshBasicMaterial({ color: 0x7B52C0, wireframe: true, transparent: true, opacity: 0.18 })
        const purpleSolidMat = new THREE.MeshStandardMaterial({ color: 0x3B1F6B, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.35 })
        const dimWireMat = new THREE.MeshBasicMaterial({ color: 0x5B35A0, wireframe: true, transparent: true, opacity: 0.07 })

        /* ── Helper: build mesh group ─────────────── */
        function mkGroup(geo, wireMat, solidMat) {
            const g = new THREE.Group()
            g.add(new THREE.Mesh(geo, solidMat), new THREE.Mesh(geo, wireMat))
            return g
        }

        /* ── Objects ──────────────────────────────── */
        const objects = []

        // 1. Large central crystal (octahedron) — right side
        const mainGeo = new THREE.OctahedronGeometry(2.4, 2)
        const mainGroup = mkGroup(mainGeo, new THREE.MeshBasicMaterial({ color: 0xC9A84C, wireframe: true, transparent: true, opacity: 0.18 }), purpleSolidMat)
        mainGroup.position.set(5, 0.5, -2)
        scene.add(mainGroup)
        objects.push({ obj: mainGroup, rx: 0.003, ry: 0.006, rz: 0.001, float: { amp: 0.3, spd: 0.7, off: 0 } })

        // 2. Dodecahedron — left middle
        const dodGroup = mkGroup(new THREE.DodecahedronGeometry(1.3, 0), goldWireMat, goldSolidMat)
        dodGroup.position.set(-5, 1, -1)
        scene.add(dodGroup)
        objects.push({ obj: dodGroup, rx: 0.007, ry: 0.004, rz: 0.002, float: { amp: 0.4, spd: 1.1, off: 1.5 } })

        // 3. Icosahedron — bottom left
        const icoGroup = mkGroup(new THREE.IcosahedronGeometry(0.9, 0), goldWireMat.clone(), new THREE.MeshStandardMaterial({ color: 0xC9A84C, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.1 }))
        icoGroup.position.set(-3.5, -3, 0.5)
        scene.add(icoGroup)
        objects.push({ obj: icoGroup, rx: 0.009, ry: 0.006, rz: 0.003, float: { amp: 0.25, spd: 0.9, off: 0.8 } })

        // 4. Torus knot — bottom right
        const torusKnotGeo = new THREE.TorusKnotGeometry(0.8, 0.18, 100, 14)
        const tkMat = new THREE.MeshBasicMaterial({ color: 0xC9A84C, wireframe: true, transparent: true, opacity: 0.22 })
        const tkSolidMat = new THREE.MeshStandardMaterial({ color: 0xC9A84C, metalness: 0.95, roughness: 0.05, transparent: true, opacity: 0.08 })
        const torusGroup = mkGroup(torusKnotGeo, tkMat, tkSolidMat)
        torusGroup.position.set(3.5, -3, 0.5)
        scene.add(torusGroup)
        objects.push({ obj: torusGroup, rx: 0.004, ry: 0.009, rz: 0.005, float: { amp: 0.35, spd: 1.2, off: 2.5 } })

        // 5. Small tetrahedron — top left
        const tetGroup = mkGroup(new THREE.TetrahedronGeometry(0.7, 0), purpleWireMat, goldSolidMat.clone())
        tetGroup.position.set(-2, 3.5, 0)
        scene.add(tetGroup)
        objects.push({ obj: tetGroup, rx: 0.012, ry: 0.006, rz: 0.009, float: { amp: 0.2, spd: 1.4, off: 1.2 } })

        // 6. Ring (torus) — far left top
        const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 60)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0.3 })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.position.set(-6, 3, -2)
        ring.rotation.x = Math.PI / 4
        scene.add(ring)
        objects.push({ obj: ring, rx: 0.003, ry: 0.008, rz: 0.002, float: { amp: 0.15, spd: 0.6, off: 3.5 } })

        // 7. Large dim background sphere
        const bgSphere = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 20), dimWireMat)
        bgSphere.position.set(0, 0, -8)
        scene.add(bgSphere)
        objects.push({ obj: bgSphere, rx: 0.001, ry: 0.002, rz: 0, float: { amp: 0, spd: 0, off: 0 } })

        // 8. Diamond (octahedron small) — right top
        const diamondGroup = mkGroup(new THREE.OctahedronGeometry(0.6, 0), goldWireMat.clone(), goldSolidMat.clone())
        diamondGroup.position.set(6.5, 3, 1)
        scene.add(diamondGroup)
        objects.push({ obj: diamondGroup, rx: 0.01, ry: 0.008, rz: 0.004, float: { amp: 0.3, spd: 1.0, off: 0.5 } })

        /* ── Particles ────────────────────────────── */
        const PCount = 280
        const pPos = new Float32Array(PCount * 3)
        const pSizes = new Float32Array(PCount)
        for (let i = 0; i < PCount; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * 28
            pPos[i * 3 + 1] = (Math.random() - 0.5) * 22
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 14
            pSizes[i] = Math.random() * 0.06 + 0.02
        }
        const pGeo = new THREE.BufferGeometry()
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
        pGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1))
        const pMat = new THREE.PointsMaterial({ color: 0xC9A84C, size: 0.05, transparent: true, opacity: 0.45 })
        const particles = new THREE.Points(pGeo, pMat)
        scene.add(particles)

        /* ── Mouse parallax ───────────────────────── */
        let mx = 0, my = 0
        const onMouseMove = (e) => {
            mx = (e.clientX / window.innerWidth - 0.5) * 2
            my = (e.clientY / window.innerHeight - 0.5) * 2
        }
        window.addEventListener('mousemove', onMouseMove)

        /* ── Animation loop ───────────────────────── */
        const clock = new THREE.Clock()
        let raf

        function animate() {
            raf = requestAnimationFrame(animate)
            const t = clock.getElapsedTime()

            objects.forEach(({ obj, rx, ry, rz, float: f }) => {
                obj.rotation.x += rx
                obj.rotation.y += ry
                obj.rotation.z += rz
                if (f.amp > 0) {
                    obj.position.y += Math.sin(t * f.spd + f.off) * f.amp * 0.006
                }
            })

            particles.rotation.y += 0.0003
            particles.rotation.x += 0.0001

            // Subtle camera drift
            camera.position.x += (mx * 1.5 - camera.position.x) * 0.025
            camera.position.y += (-my * 1.0 - camera.position.y) * 0.025
            camera.lookAt(0, 0, 0)

            renderer.render(scene, camera)
        }
        animate()

        /* ── Resize ───────────────────────────────── */
        const onResize = () => {
            const W2 = mount.clientWidth, H2 = mount.clientHeight
            camera.aspect = W2 / H2
            camera.updateProjectionMatrix()
            renderer.setSize(W2, H2)
        }
        window.addEventListener('resize', onResize)

        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('resize', onResize)
            renderer.dispose()
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
        }
    }, [])

    return <div ref={mountRef} className="absolute inset-0 z-[1]" />
}
