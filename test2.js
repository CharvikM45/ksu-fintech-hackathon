    
        // Walkthrough Logic
        let currentStep = 0;
        let walkthroughActive = false;
        let walkthroughPhase = 'explaining';
        
        const walkthroughSteps = [
            {
                title: "Welcome to Bankify",
                text: "This is a fully interactive demo. We will guide you through the app. To begin, click Explore, then click on Alice's demo account.",
                element: "#tour-login-alice",
                requireAction: true,
                actionEvent: "login"
            },
            {
                title: "The Dashboard",
                text: "Welcome to your command center! Here you can see your balance, recent activity, and quick actions. When you're done looking around, click the 'Send' button.",
                element: "#tour-qa-send",
                requireAction: true,
                actionEvent: "nav-send"
            },
            {
                title: "Send Page",
                text: "Here you can enter a phone number and amount. All transfers are cryptographically signed and routed peer-to-peer. When you're ready, click 'Receive' in the dock.",
                element: "#nav-receive",
                requireAction: true,
                actionEvent: "nav-receive"
            },
            {
                title: "Receive Money",
                text: "You can display this QR code for others to scan, or send payment requests directly. Next, let's view our History. Click 'History' in the dock.",
                element: "#nav-transactions",
                requireAction: true,
                actionEvent: "nav-transactions"
            },
            {
                title: "Transaction History",
                text: "This page syncs your local offline ledger with the cloud whenever internet is restored. Now, let's check your TrustScore. Click 'Trust'.",
                element: "#nav-credit",
                requireAction: true,
                actionEvent: "nav-credit"
            },
            {
                title: "TrustScore",
                text: "Without traditional credit bureaus, Bankify uses local community trust to build your financial identity and unlock micro-loans. Finally, let's look at the AI. Click 'AI'.",
                element: "#nav-ai",
                requireAction: true,
                actionEvent: "nav-ai"
            },
            {
                title: "Local AI Insights",
                text: "Our lightweight AI analyzes your spending habits and detects fraud entirely on-device, preserving your privacy.",
                element: null,
                requireAction: false
            }
        ];

        function startWalkthrough() {
            currentStep = 0;
            walkthroughActive = true;
            walkthroughPhase = 'explaining';
            document.getElementById('walkthrough-overlay').classList.add('active');
            updateWalkthrough();
        }

        function endWalkthrough() {
            walkthroughActive = false;
            document.getElementById('walkthrough-overlay').classList.remove('active');
            document.getElementById('tour-highlighter').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('tour-highlighter').style.display = 'none';
            }, 500);
        }

        function handleWalkthroughNextClick() {
            const step = walkthroughSteps[currentStep];
            if (step.requireAction && walkthroughPhase === 'explaining') {
                walkthroughPhase = 'exploring';
                updateWalkthrough();
            } else {
                nextWalkthroughStep();
            }
        }

        function nextWalkthroughStep() {
            if (!walkthroughActive) return;
            
            currentStep++;
            if (currentStep >= walkthroughSteps.length) {
                endWalkthrough();
            } else {
                walkthroughPhase = 'explaining';
                updateWalkthrough();
            }
        }

        function updateWalkthrough() {
            const step = walkthroughSteps[currentStep];
            const highlighter = document.getElementById('tour-highlighter');
            const overlay = document.getElementById('walkthrough-overlay');
            
            if (walkthroughPhase === 'explaining') {
                overlay.classList.add('active');
                
                document.getElementById('walkthrough-step-badge').innerText = currentStep + 1;
                document.getElementById('walkthrough-title').innerText = step.title;
                document.getElementById('walkthrough-text').innerText = step.text;
                
                const nextBtn = document.getElementById('walkthrough-next');
                nextBtn.style.display = 'block';
                if (step.requireAction) {
                    nextBtn.innerText = "Explore";
                } else {
                    nextBtn.innerText = currentStep === walkthroughSteps.length - 1 ? "Finish" : "Next Step";
                }

                highlighter.style.opacity = '0';
                highlighter.classList.remove('subtle-highlight');
                
            } else if (walkthroughPhase === 'exploring') {
                overlay.classList.remove('active');
                
                if (step.element) {
                    const el = document.querySelector(step.element);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        highlighter.style.display = 'block';
                        highlighter.classList.add('subtle-highlight');
                        
                        setTimeout(() => {
                            const rect = el.getBoundingClientRect();
                            highlighter.style.top = (rect.top - 8) + 'px';
                            highlighter.style.left = (rect.left - 8) + 'px';
                            highlighter.style.width = (rect.width + 16) + 'px';
                            highlighter.style.height = (rect.height + 16) + 'px';
                            highlighter.style.opacity = '1';
                        }, 50);
                    }
                }
            }
        }

        // Global Click Interceptor
        document.addEventListener('click', function(e) {
            if (!walkthroughActive) return;
            const step = walkthroughSteps[currentStep];
            
            const card = document.querySelector('.walkthrough-card');
            if (card && card.contains(e.target)) return;
            
            if (step && step.requireAction && walkthroughPhase === 'exploring' && step.element) {
                const el = document.querySelector(step.element);
                if (el && !el.contains(e.target)) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            } else if (walkthroughPhase === 'explaining') {
                e.stopPropagation();
                e.preventDefault();
            }
        }, true); // Use capture phase

        // Hook into App Actions for Walkthrough
        function handleWalkthroughAction(actionStr) {
            if (!walkthroughActive) return;
            const step = walkthroughSteps[currentStep];
            if (step && step.requireAction && step.actionEvent === actionStr && walkthroughPhase === 'exploring') {
                document.getElementById('tour-highlighter').style.opacity = '0';
                setTimeout(nextWalkthroughStep, 400);
            }
        }
            }
        }

        // Monkey-patch demoLogin
        if (typeof window.demoLogin === 'function') {
            const originalDemoLogin = window.demoLogin;
            window.demoLogin = function(phone, pin) {
                originalDemoLogin(phone, pin);
                handleWalkthroughAction('login');
            };
        }

        // Monkey-patch navigateTo
        if (typeof window.navigateTo === 'function') {
            const originalNavigateTo = window.navigateTo;
            window.navigateTo = function(pageId) {
                originalNavigateTo(pageId);
                handleWalkthroughAction('nav-' + pageId);
            };
        }

        // Auto-start walkthrough on first visit to demo
        window.addEventListener('load', () => {
            setTimeout(startWalkthrough, 1000);
        });
    
