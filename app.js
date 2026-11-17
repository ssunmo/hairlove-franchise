document.addEventListener('DOMContentLoaded', () => {

    // One preference controls the hero, product images and reveal effects.
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionButtons = document.querySelectorAll('.motion-toggle');
    const motionImages = document.querySelectorAll('[data-motion]');
    const motionStorageKey = 'hairlove-motion-paused';
    let userPaused = false;
    try {
        userPaused = localStorage.getItem(motionStorageKey) === 'true';
    } catch { /* Motion controls also work when storage is unavailable. */ }

    const motionIsPaused = () => userPaused || reducedMotion.matches;
    const finishCounters = () => {
        document.querySelectorAll('.stat-num').forEach(stat => {
            stat.textContent = stat.dataset.target;
        });
    };

    const syncMotion = () => {
        const paused = motionIsPaused();
        root.classList.toggle('motion-paused', paused);
        motionButtons.forEach(button => {
            button.hidden = false;
            button.disabled = reducedMotion.matches;
            button.setAttribute('aria-pressed', String(paused));
            button.querySelector('.motion-label').textContent = reducedMotion.matches
                ? '모션 감소 사용 중' : paused ? '움직임 재생' : '움직임 정지';
            button.querySelector('.motion-icon').textContent = paused ? '▶' : 'Ⅱ';
            button.title = reducedMotion.matches
                ? '기기의 모션 감소 설정에 따라 움직임이 꺼져 있습니다.'
                : '페이지 전체의 이미지와 움직임 효과를 제어합니다.';
        });
        if (paused) {
            document.querySelectorAll('.scroll-reveal').forEach(el => el.classList.add('active'));
            finishCounters();
        }
    };

    motionButtons.forEach(button => {
        button.addEventListener('click', () => {
            userPaused = !userPaused;
            try {
                localStorage.setItem(motionStorageKey, String(userPaused));
            } catch { /* Keep the preference for this page even without storage. */ }
            syncMotion();
        });
    });
    reducedMotion.addEventListener('change', syncMotion);
    syncMotion();

    const syncPageVisibility = () => root.classList.toggle('page-hidden', document.hidden);
    document.addEventListener('visibilitychange', syncPageVisibility);
    syncPageVisibility();

    if ('IntersectionObserver' in window) {
        const motionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
        }, { threshold: 0 });
        motionImages.forEach(img => motionObserver.observe(img));
        root.classList.add('motion-ready');
    }

    const syncOverlayState = () => {
        const hasOverlay = !!document.querySelector('.mobile-drawer.open, .lightbox-modal.open, .modal-overlay.open');
        document.body.classList.toggle('no-scroll', hasOverlay);
        root.classList.toggle('overlay-open', hasOverlay);
    };

    // 1. Sticky Header scroll styling
    const header = document.getElementById('main-header');
    
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    // 2. Mobile Drawer Navigation toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const drawerLinks = document.querySelectorAll('.drawer-link');

    const setDrawerOpen = (open) => {
        mobileToggle.classList.toggle('open', open);
        mobileDrawer.classList.toggle('open', open);
        mobileDrawer.inert = !open;
        mobileToggle.setAttribute('aria-expanded', String(open));
        mobileToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
        syncOverlayState();
    };

    mobileToggle.addEventListener('click', () => setDrawerOpen(!mobileDrawer.classList.contains('open')));

    window.matchMedia('(min-width: 769px)').addEventListener('change', event => {
        if (event.matches) setDrawerOpen(false);
    });

    drawerLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileDrawer.classList.contains('open')) {
                setDrawerOpen(false);
            }
        });
    });

    // 3. Scroll spy - active menu links highlighting
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-menu a');

    const updateActiveNavLink = () => {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 150; // offset for header

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < (sectionTop + sectionHeight)) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', updateActiveNavLink);

    // 4. Scroll Reveal Animations (Intersection Observer)
    const revealElements = document.querySelectorAll('.scroll-reveal');
    
    const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                
                // If it contains a stat card, trigger count up
                const stats = entry.target.querySelectorAll('.stat-num');
                if (stats.length > 0) {
                    stats.forEach(stat => animateValue(stat));
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    }) : null;

    if (revealObserver && !motionIsPaused()) {
        root.classList.add('reveal-ready');
        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('active'));
        finishCounters();
    }

    // 5. Stat Counter Ticking Animation
    function animateValue(obj) {
        const start = 0;
        const end = parseInt(obj.getAttribute('data-target'), 10);
        const duration = 1500; // ms
        let startTimestamp = null;
        
        const step = (timestamp) => {
            if (motionIsPaused() || document.hidden) {
                obj.textContent = end;
                return;
            }
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end;
            }
        };
        
        window.requestAnimationFrame(step);
    }

    // 6. FAQ Accordion toggle
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item, index) => {
        const questionButton = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        answer.id = `faq-answer-${index + 1}`;
        questionButton.setAttribute('aria-controls', answer.id);
        questionButton.setAttribute('aria-expanded', 'false');
        questionButton.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });
            
            // Toggle clicked item
            if (!isActive) {
                item.classList.add('active');
                questionButton.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // 7. Form Submission & Validation with Web3Forms & LocalStorage backup
    const form = document.getElementById('franchise-form');
    const submitBtn = form.querySelector('.btn-submit');
    const successModal = document.getElementById('success-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Access Key configuration
    // 주인님, web3forms.com 에서 발급받으신 액세스 키를 아래에 입력해 주시면 실제 이메일 전송이 활성화됩니다.
    const WEB3FORMS_ACCESS_KEY = "5a2af75a-0b6e-4e3a-90bd-9f432acb9a44"; 

    // Auto-format phone number input (010-XXXX-XXXX)
    const phoneInput = document.getElementById('userphone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length > 3 && val.length <= 7) {
                val = val.substr(0, 3) + '-' + val.substr(3);
            } else if (val.length > 7) {
                val = val.substr(0, 3) + '-' + val.substr(3, 4) + '-' + val.substr(7, 4);
            }
            e.target.value = val;
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Simple input extraction
        const name = document.getElementById('username').value.trim();
        const phone = document.getElementById('userphone').value.trim();
        const location = document.getElementById('location').value.trim();
        const budget = document.getElementById('budget').value;
        const message = document.getElementById('message').value.trim();
        const privacyChecked = document.getElementById('privacy').checked;

        if (!name || !phone || !location || !privacyChecked) {
            alert('필수 작성 항목을 모두 채워주세요.');
            return;
        }

        // Disable button & change text to show sending status
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '신청서 전송 중... <i class="fa-solid fa-spinner fa-spin"></i>';

        // LocalStorage backup data
        const inquiryData = {
            name,
            phone,
            location,
            budget,
            message,
            submittedAt: new Date().toISOString()
        };

        // Prepare Web3Forms payload
        let budgetLabel = '미선택';
        if (budget === '2000-3000') budgetLabel = '2,000만원 ~ 3,000만원';
        else if (budget === '3000-5000') budgetLabel = '3,000만원 ~ 5,000만원';
        else if (budget === '5000-over') budgetLabel = '5,000만원 이상';

        const formData = {
            access_key: WEB3FORMS_ACCESS_KEY,
            name: name,
            phone: phone,
            location: location,
            budget: budgetLabel,
            message: message,
            subject: `[머릿결사랑] 가맹 문의 신청서가 접수되었습니다 - ${name}님`,
            from_name: "머릿결사랑 프랜차이즈"
        };

        const handleSuccess = () => {
            // Backup to LocalStorage
            let existingInquiries = JSON.parse(localStorage.getItem('franchise_inquiries') || '[]');
            existingInquiries.push(inquiryData);
            localStorage.setItem('franchise_inquiries', JSON.stringify(existingInquiries));

            // Restore button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;

            // Open Success Modal
            successModal.classList.add('open');
            syncOverlayState();

            // Form reset
            form.reset();
        };

        // If Access Key is not configured yet, run demo mode (success modal only)
        if (WEB3FORMS_ACCESS_KEY === "YOUR_ACCESS_KEY_HERE" || !WEB3FORMS_ACCESS_KEY) {
            console.log("Web3Forms Access Key is not configured. Running in demo mode.");
            setTimeout(() => {
                handleSuccess();
            }, 1000);
            return;
        }

        // Actual Send via Web3Forms API
        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(async (response) => {
            let json = await response.json();
            if (response.status === 200) {
                handleSuccess();
            } else {
                console.error(json);
                alert('전송 중 오류가 발생했습니다. 이메일(chongchon3@gmail.com)로 직접 문의해 주시거나 잠시 후 다시 시도해 주세요.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        })
        .catch(error => {
            console.error(error);
            alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        });
    });

    modalCloseBtn.addEventListener('click', () => {
        successModal.classList.remove('open');
        syncOverlayState();
    });

    // Close modal on click outside
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.classList.remove('open');
            syncOverlayState();
        }
    });

    // 8. Lightbox Modal functions
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    let lightboxTrigger = null;

    window.openLightbox = (imageSrc, trigger = document.activeElement) => {
        if (lightbox && lightboxImg) {
            lightboxTrigger = trigger;
            lightboxImg.src = imageSrc;
            lightboxImg.alt = trigger?.querySelector('img')?.alt || '확대 이미지';
            lightbox.classList.add('open');
            syncOverlayState();
            lightboxClose.focus();
        }
    };

    window.closeLightbox = () => {
        if (lightbox) {
            lightbox.classList.remove('open');
            syncOverlayState();
            lightboxImg.removeAttribute('src');
            lightboxTrigger?.focus({ preventScroll: true });
        }
    };

    document.querySelectorAll('[data-lightbox]').forEach(button => {
        button.addEventListener('click', () => window.openLightbox(button.dataset.lightbox, button));
    });
    lightboxClose.addEventListener('click', window.closeLightbox);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (lightbox.classList.contains('open')) window.closeLightbox();
            if (mobileDrawer.classList.contains('open')) {
                setDrawerOpen(false);
                mobileToggle.focus();
            }
        }
        if (event.key === 'Tab' && lightbox.classList.contains('open')) {
            event.preventDefault();
            lightboxClose.focus();
        } else if (event.key === 'Tab' && mobileDrawer.classList.contains('open')) {
            const lastLink = mobileDrawer.querySelector('.btn-drawer-cta');
            if (event.shiftKey && document.activeElement === mobileToggle) {
                event.preventDefault();
                lastLink.focus();
            } else if (!event.shiftKey && document.activeElement === lastLink) {
                event.preventDefault();
                mobileToggle.focus();
            }
        }
    });

    // Close lightbox on overlay click
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                window.closeLightbox();
            }
        });
    }

});
