// Modern UI Enhancements for WhisperPrint
// Inspired by award-winning websites on Awwwards

// Add Three.js for 3D effects
document.addEventListener('DOMContentLoaded', () => {
    // Dynamically load Three.js if not already included
    if (typeof THREE === 'undefined') {
        const threeScript = document.createElement('script');
        threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        document.head.appendChild(threeScript);
        
        // Wait for Three.js to load
        threeScript.onload = initializeModernUI;
    } else {
        initializeModernUI();
    }
    
    // Add GSAP for animations
    const gsapScript = document.createElement('script');
    gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.5/gsap.min.js';
    document.head.appendChild(gsapScript);
    
    // Add GSAP ScrollTrigger plugin
    gsapScript.onload = () => {
        const scrollTriggerScript = document.createElement('script');
        scrollTriggerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.5/ScrollTrigger.min.js';
        document.head.appendChild(scrollTriggerScript);
        
        scrollTriggerScript.onload = initScrollAnimations;
    };
    
    // Add custom cursor
    createCustomCursor();
    
    // Add Matrix code rain background
    createMatrixBackground();
    
    // Add cybersecurity shield particles
    createShieldParticles();
    
    // Add fingerprint scanning effect
    addFingerprintScanEffect();
    
    // Add encryption animations
    addEncryptionAnimations();
});

function initializeModernUI() {
    console.log('Initializing modern UI enhancements...');
    
    // Add 3D logo animation
    create3DLogo();
    
    // Add hover effects to buttons
    enhanceButtons();
    
    // Add parallax effects
    addParallaxEffects();
    
    // Add typing animation to placeholders
    addTypingAnimations();
}

function create3DLogo() {
    // Create a container for the 3D logo
    const logoContainer = document.createElement('div');
    logoContainer.className = 'logo-3d-container';
    logoContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.3;
    `;
    
    // Insert it behind the logo
    const headerLogo = document.querySelector('.logo');
    if (headerLogo) {
        headerLogo.style.position = 'relative';
        headerLogo.style.zIndex = '1';
        headerLogo.parentNode.insertBefore(logoContainer, headerLogo);
        
        // Set up Three.js scene if available
        if (typeof THREE !== 'undefined') {
            // Create scene, camera, renderer
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ alpha: true });
            renderer.setSize(200, 100);
            logoContainer.appendChild(renderer.domElement);
            
            // Create a simple 3D object (sphere with wave effect)
            const geometry = new THREE.SphereGeometry(15, 32, 32);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0x3498db,
                wireframe: true
            });
            const sphere = new THREE.Mesh(geometry, material);
            scene.add(sphere);
            
            camera.position.z = 50;
            
            // Animation loop
            function animate() {
                requestAnimationFrame(animate);
                
                sphere.rotation.x += 0.005;
                sphere.rotation.y += 0.01;
                
                // Apply wave effect
                const time = Date.now() * 0.001;
                sphere.geometry.vertices?.forEach((vertex, i) => {
                    const originalVertex = sphere.geometry._originalVertices?.[i] || vertex.clone();
                    if (!sphere.geometry._originalVertices) {
                        sphere.geometry._originalVertices = sphere.geometry.vertices.map(v => v.clone());
                    }
                    
                    const wave = Math.sin(time + originalVertex.x * 0.05) * 2;
                    vertex.copy(originalVertex);
                    vertex.multiplyScalar(1 + wave * 0.03);
                });
                
                if (sphere.geometry.verticesNeedUpdate !== undefined) {
                    sphere.geometry.verticesNeedUpdate = true;
                }
                
                renderer.render(scene, camera);
            }
            
            animate();
        }
    }
}

function enhanceButtons() {
    // Add magnetic effect to buttons
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(button => {
        button.addEventListener('mousemove', (e) => {
            const boundingRect = button.getBoundingClientRect();
            const btnX = boundingRect.left + boundingRect.width / 2;
            const btnY = boundingRect.top + boundingRect.height / 2;
            const distanceX = e.clientX - btnX;
            const distanceY = e.clientY - btnY;
            
            // Apply a subtle transform to create a magnetic effect
            button.style.transform = `translate(${distanceX * 0.1}px, ${distanceY * 0.1}px)`;
        });
        
        button.addEventListener('mouseleave', () => {
            // Reset transform on mouse leave with a smooth transition
            button.style.transition = 'transform 0.5s ease';
            button.style.transform = 'translate(0, 0)';
            setTimeout(() => {
                button.style.transition = '';
            }, 500);
        });
        
        // Add glitch effect on click
        button.addEventListener('click', () => {
            button.classList.add('glitch-effect');
            setTimeout(() => {
                button.classList.remove('glitch-effect');
            }, 500);
        });
    });
}

function createCustomCursor() {
    // Create custom cursor elements
    const cursorOuter = document.createElement('div');
    cursorOuter.className = 'cursor-outer';
    cursorOuter.style.cssText = `
        position: fixed;
        width: 30px;
        height: 30px;
        border: 1px solid var(--primary-color);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 9999;
        opacity: 0.5;
        transition: width 0.2s, height 0.2s, opacity 0.2s;
    `;
    
    const cursorInner = document.createElement('div');
    cursorInner.className = 'cursor-inner';
    cursorInner.style.cssText = `
        position: fixed;
        width: 5px;
        height: 5px;
        background-color: var(--primary-color);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 9999;
        transition: width 0.1s, height 0.1s;
    `;
    
    document.body.appendChild(cursorOuter);
    document.body.appendChild(cursorInner);
    
    // Update cursor position
    document.addEventListener('mousemove', (e) => {
        cursorOuter.style.left = `${e.clientX}px`;
        cursorOuter.style.top = `${e.clientY}px`;
        
        cursorInner.style.left = `${e.clientX}px`;
        cursorInner.style.top = `${e.clientY}px`;
    });
    
    // Grow cursor on interactive elements
    const interactiveElements = document.querySelectorAll('button, a, input, textarea, .tab');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseover', () => {
            cursorOuter.style.width = '50px';
            cursorOuter.style.height = '50px';
            cursorOuter.style.opacity = '0.3';
            cursorInner.style.width = '8px';
            cursorInner.style.height = '8px';
        });
        
        element.addEventListener('mouseout', () => {
            cursorOuter.style.width = '30px';
            cursorOuter.style.height = '30px';
            cursorOuter.style.opacity = '0.5';
            cursorInner.style.width = '5px';
            cursorInner.style.height = '5px';
        });
    });
    
    // Hide default cursor
    document.body.style.cursor = 'none';
    
    // Make sure interactive elements still show correct cursor
    interactiveElements.forEach(element => {
        element.style.cursor = 'none';
    });
}

function initScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn('GSAP or ScrollTrigger not loaded');
        return;
    }
    
    // Register ScrollTrigger with GSAP
    gsap.registerPlugin(ScrollTrigger);
    
    // Animate cards on scroll
    const cards = document.querySelectorAll('.card');
    
    cards.forEach((card, index) => {
        gsap.fromTo(card, 
            { 
                y: 100, 
                opacity: 0 
            }, 
            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top 80%",
                    end: "bottom 20%",
                    toggleActions: "play none none reverse"
                },
                delay: index * 0.1
            }
        );
    });
    
    // Animate headings with text reveal effect
    const headings = document.querySelectorAll('.card-title');
    
    headings.forEach(heading => {
        const textWrapper = document.createElement('div');
        textWrapper.style.overflow = 'hidden';
        
        const parent = heading.parentNode;
        parent.insertBefore(textWrapper, heading);
        textWrapper.appendChild(heading);
        
        gsap.fromTo(heading, 
            { y: 100 }, 
            {
                y: 0,
                duration: 0.6,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: textWrapper,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                }
            }
        );
    });
}

function createMatrixBackground() {
    const canvas = document.createElement('canvas');
    canvas.id = 'matrix-background';
    canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -2;
        opacity: 0.07;
    `;
    
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create matrix characters
    const characters = '01'.split('');
    const fontSize = 10;
    const columns = Math.floor(canvas.width / fontSize);
    
    // Initialize drops array
    const drops = [];
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.floor(Math.random() * canvas.height / fontSize);
    }
    
    // Animation loop
    function drawMatrix() {
        // Semi-transparent black for fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set text color and font
        ctx.fillStyle = '#0F0';
        ctx.font = `${fontSize}px monospace`;
        
        // Draw characters
        for (let i = 0; i < drops.length; i++) {
            // Random character
            const char = characters[Math.floor(Math.random() * characters.length)];
            
            // Draw character
            ctx.fillText(char, i * fontSize, drops[i] * fontSize);
            
            // Move drop down and reset if needed
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            
            drops[i]++;
        }
        
        requestAnimationFrame(drawMatrix);
    }
    
    drawMatrix();
}

function createShieldParticles() {
    const container = document.createElement('div');
    container.id = 'shield-particles';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
        opacity: 0.2;
    `;
    
    document.body.appendChild(container);
    
    // Create shield-shaped particles
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'shield-particle';
        
        // Random position
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        
        // Random size
        const size = Math.random() * 30 + 10;
        
        // Random animation duration
        const duration = Math.random() * 10 + 10;
        
        particle.style.cssText = `
            position: absolute;
            top: ${posY}%;
            left: ${posX}%;
            width: ${size}px;
            height: ${size * 1.2}px;
            background-color: rgba(52, 152, 219, 0.1);
            border: 1px solid rgba(52, 152, 219, 0.3);
            border-radius: ${size * 0.5}px ${size * 0.5}px 50% 50%;
            transform: rotate(${Math.random() * 360}deg);
            animation: float ${duration}s infinite ease-in-out;
        `;
        
        container.appendChild(particle);
    }
}

function addFingerprintScanEffect() {
    // Create a container for the fingerprint elements
    const container = document.querySelector('#fingerprint-tab');
    
    if (container) {
        // Create scan line
        const scanLine = document.createElement('div');
        scanLine.className = 'fingerprint-scan-line';
        scanLine.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, 
                rgba(52, 152, 219, 0) 0%, 
                rgba(52, 152, 219, 0.8) 50%, 
                rgba(52, 152, 219, 0) 100%);
            box-shadow: 0 0 10px rgba(52, 152, 219, 0.8);
            z-index: 3;
            opacity: 0;
            pointer-events: none;
            animation: scanAnimation 3s ease-in-out infinite;
        `;
        
        container.style.position = 'relative';
        container.appendChild(scanLine);
        
        // Add scan animation when button is clicked
        const fingerprintButton = document.querySelector('#fingerprint-button') || document.querySelector('[id*="fingerprint"][id*="button"]');
        
        if (fingerprintButton) {
            fingerprintButton.addEventListener('click', () => {
                scanLine.style.opacity = '1';
                setTimeout(() => {
                    scanLine.style.opacity = '0';
                }, 3000);
            });
        }
    }
}

function addEncryptionAnimations() {
    // Create encryption characters
    const chars = '01'.split('');
    const textInputs = document.querySelectorAll('textarea, input[type="text"]');
    
    textInputs.forEach(input => {
        input.addEventListener('input', () => {
            // Show encryption animation when typing
            const text = input.value;
            if (text.length > 0) {
                // Create animated characters around the input
                const container = input.parentNode;
                
                // Check if we already have encryption animation
                if (!container.querySelector('.encryption-animation')) {
                    const encryptionEl = document.createElement('div');
                    encryptionEl.className = 'encryption-animation';
                    encryptionEl.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                        z-index: 2;
                        opacity: 0.7;
                        overflow: hidden;
                    `;
                    
                    // Position it correctly
                    container.style.position = 'relative';
                    container.appendChild(encryptionEl);
                    
                    // Add 20 floating characters
                    for (let i = 0; i < 20; i++) {
                        const char = document.createElement('div');
                        char.className = 'encryption-char';
                        char.textContent = chars[Math.floor(Math.random() * chars.length)];
                        
                        // Random position
                        const posX = Math.random() * 100;
                        const posY = Math.random() * 100;
                        
                        // Random animation duration
                        const duration = Math.random() * 2 + 1;
                        const delay = Math.random() * 2;
                        
                        char.style.cssText = `
                            position: absolute;
                            top: ${posY}%;
                            left: ${posX}%;
                            color: var(--primary-color);
                            font-family: monospace;
                            font-size: 12px;
                            opacity: 0;
                            animation: encryptChar ${duration}s ${delay}s infinite alternate;
                        `;
                        
                        encryptionEl.appendChild(char);
                    }
                }
            }
        });
    });
    
    // Add encryption effect to forms on submit
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            // Create encryption overlay
            const overlay = document.createElement('div');
            overlay.className = 'encryption-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.3);
                z-index: 9998;
                display: flex;
                justify-content: center;
                align-items: center;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            document.body.appendChild(overlay);
            
            // Create a pulsing shield icon
            const shield = document.createElement('div');
            shield.className = 'encryption-shield';
            shield.style.cssText = `
                width: 100px;
                height: 120px;
                background-color: rgba(52, 152, 219, 0.2);
                border: 2px solid var(--primary-color);
                border-radius: 50% 50% 0 0;
                display: flex;
                justify-content: center;
                align-items: center;
                animation: shieldPulse 1.5s infinite ease-in-out;
            `;
            
            shield.innerHTML = `
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M8 11l3 3 5-5"></path>
                </svg>
            `;
            
            overlay.appendChild(shield);
            
            // Show overlay
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 0);
            
            // Hide overlay after 1.5 seconds
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                }, 300);
            }, 1500);
        });
    });
}

function addParallaxEffects() {
    // Add parallax effect to content on mouse move
    const content = document.querySelector('.content');
    
    if (content) {
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth - 0.5;
            const mouseY = e.clientY / window.innerHeight - 0.5;
            
            // Apply subtle parallax effect to the content
            content.style.transform = `translate(${mouseX * -10}px, ${mouseY * -10}px)`;
        });
    }
}

function addTypingAnimations() {
    // Add typing animation to textarea placeholders
    const textareas = document.querySelectorAll('textarea');
    
    textareas.forEach(textarea => {
        const originalPlaceholder = textarea.getAttribute('placeholder');
        
        textarea.addEventListener('focus', () => {
            if (originalPlaceholder) {
                textarea.setAttribute('placeholder', '');
                let i = 0;
                
                const typing = setInterval(() => {
                    textarea.setAttribute('placeholder', originalPlaceholder.substring(0, i));
                    i++;
                    
                    if (i > originalPlaceholder.length) {
                        clearInterval(typing);
                    }
                }, 50);
            }
        });
        
        textarea.addEventListener('blur', () => {
            textarea.setAttribute('placeholder', originalPlaceholder);
        });
    });
}

// Add stylesheet for modern UI effects
const style = document.createElement('style');
style.textContent = `
    /* Glitch effect for buttons */
    .glitch-effect {
        animation: glitch 0.5s cubic-bezier(.25, .46, .45, .94) both;
    }
    
    @keyframes glitch {
        0% {
            transform: translate(0);
            text-shadow: 0 0 0 rgba(0, 0, 0, 0);
        }
        10% {
            transform: translate(-5px, 5px);
            text-shadow: -1px -1px 0 rgba(255, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 255, 0.5);
        }
        20% {
            transform: translate(5px, -5px);
            text-shadow: 1px 1px 0 rgba(255, 0, 0, 0.5), -1px -1px 0 rgba(0, 0, 255, 0.5);
        }
        30% {
            transform: translate(-5px, -5px);
            text-shadow: -1px 1px 0 rgba(255, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 255, 0.5);
        }
        40% {
            transform: translate(0);
            text-shadow: 0 0 0 rgba(0, 0, 0, 0);
        }
        100% {
            transform: translate(0);
            text-shadow: 0 0 0 rgba(0, 0, 0, 0);
        }
    }
    
    /* Enhance hover effects */
    button:hover, .tab:hover {
        transform: translateY(-3px) scale(1.03);
        box-shadow: 0 7px 15px rgba(0, 0, 0, 0.15);
    }
    
    /* Card hover enhancements */
    .card {
        transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
                    box-shadow 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                    background-color 0.3s ease;
    }
    
    .card:hover {
        transform: translateY(-8px) scale(1.01);
        box-shadow: 0 15px 25px rgba(0, 0, 0, 0.12);
        background-color: rgba(255, 255, 255, 0.95);
    }
    
    /* Smoothen transitions */
    * {
        transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    
    /* Remove default focus outlines and replace with custom styling */
    *:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.5);
    }
    
    /* Add gradient text effect to headings */
    h2 {
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        display: inline-block;
    }
`;

document.head.appendChild(style);

// Add stylesheet for enhanced security-themed UI effects
const securityStyle = document.createElement('style');
securityStyle.textContent = `
    /* Matrix code rain effect */
    #matrix-background {
        filter: blur(1px);
    }
    
    /* Shield particles */
    @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0); }
        50% { transform: translateY(-20px) rotate(10deg); }
    }
    
    /* Fingerprint scan animation */
    @keyframes scanAnimation {
        0% { transform: translateY(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(100%); opacity: 0; }
    }
    
    /* Encryption character animation */
    @keyframes encryptChar {
        0% { opacity: 0; transform: translateY(0); }
        50% { opacity: 0.8; }
        100% { opacity: 0; transform: translateY(-10px); }
    }
    
    /* Shield pulse animation */
    @keyframes shieldPulse {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.4); }
        70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(52, 152, 219, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
    }
    
    /* Enhanced button glow effect for primary actions */
    button[id*="fingerprint"], button[id*="identify"], button[id*="privacy"] {
        position: relative;
        overflow: hidden;
    }
    
    button[id*="fingerprint"]:after, button[id*="identify"]:after, button[id*="privacy"]:after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(52, 152, 219, 0.4) 0%, rgba(52, 152, 219, 0) 70%);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
        mix-blend-mode: screen;
    }
    
    button[id*="fingerprint"]:hover:after, button[id*="identify"]:hover:after, button[id*="privacy"]:hover:after {
        opacity: 1;
        animation: pulse-glow 2s infinite;
    }
    
    @keyframes pulse-glow {
        0% { transform: scale(0.95); }
        70% { transform: scale(1); }
        100% { transform: scale(0.95); }
    }
    
    /* Data protection visual indicators */
    .form-group {
        position: relative;
    }
    
    .form-group:after {
        content: '🔒';
        position: absolute;
        top: 0;
        right: 0;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .form-group:focus-within:after {
        opacity: 1;
    }
`;

document.head.appendChild(securityStyle); 