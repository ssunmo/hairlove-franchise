document.addEventListener('DOMContentLoaded', () => {

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

    const toggleDrawer = () => {
        mobileToggle.classList.toggle('open');
        mobileDrawer.classList.toggle('open');
        document.body.classList.toggle('no-scroll');
    };

    mobileToggle.addEventListener('click', toggleDrawer);

    drawerLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileDrawer.classList.contains('open')) {
                toggleDrawer();
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
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
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
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // 5. Stat Counter Ticking Animation
    function animateValue(obj) {
        const start = 0;
        const end = parseInt(obj.getAttribute('data-target'), 10);
        const duration = 1500; // ms
        let startTimestamp = null;
        
        const step = (timestamp) => {
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

    faqItems.forEach(item => {
        const questionButton = item.querySelector('.faq-question');
        questionButton.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // Toggle clicked item
            if (!isActive) {
                item.classList.add('active');
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
            document.body.classList.add('no-scroll');

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
        document.body.classList.remove('no-scroll');
    });

    // Close modal on click outside
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.classList.remove('open');
            document.body.classList.remove('no-scroll');
        }
    });

    // 8. Lightbox Modal functions
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');

    window.openLightbox = (imageSrc) => {
        if (lightbox && lightboxImg) {
            lightboxImg.src = imageSrc;
            lightbox.classList.add('open');
            document.body.classList.add('no-scroll');
        }
    };

    window.closeLightbox = () => {
        if (lightbox) {
            lightbox.classList.remove('open');
            document.body.classList.remove('no-scroll');
            // Reset image source after animation to prevent flickering next time
            setTimeout(() => {
                if (lightboxImg) lightboxImg.src = '';
            }, 300);
        }
    };

    // Close lightbox on overlay click
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                window.closeLightbox();
            }
        });
    }

});
