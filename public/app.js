class BegooYar {
  // ========== STATE ==========
  constructor() {
    this.apiBase = window.location.origin;
    this.currentOffset = 0;
    this.limit = 20;
    this.isLoading = false;
    this.hasMore = true;
    this.isSearching = false;
    this.isFilteringByDate = false;
    this.currentSearchTerm = "";
    this.currentDate = "";
    this.totalLoaded = 0;

    this.init();
  }

  // ========== INITIALIZATION ==========
  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadTheme();
    this.loadMessages(true);
  }

  cacheElements() {
    // Theme
    this.themeToggle = document.getElementById("themeToggle");
    this.themeIcon = this.themeToggle.querySelector("span");

    // Posting
    this.messageInput = document.getElementById("messageInput");
    this.authorInput = document.getElementById("authorInput");
    this.postBox = document.getElementById("postBox");
    this.sendBtn = document.getElementById("sendBtn");
    this.charCount = document.getElementById("charCount");
    this.postError = document.getElementById("postError");

    // Search
    this.searchInput = document.getElementById("searchInput");
    this.searchBtn = document.getElementById("searchBtn");
    this.clearSearch = document.getElementById("clearSearch");

    // Date filter
    this.dateFilter = document.getElementById("dateFilter");
    this.clearDate = document.getElementById("clearDate");
    this.dateBtn = document.getElementById("dateFilterButton");

    // Feed
    this.feed = document.getElementById("feed");
    this.feedStatus = document.getElementById("feedStatus");
    this.loadingSpinner = document.getElementById("loadingSpinner");
    this.loadMoreBtn = document.getElementById("loadMoreBtn");
    this.loadMore = document.getElementById("loadMore");

    // Back to Top
    this.backToTop = document.getElementById("backToTop");
  }

  bindEvents() {
    // Theme toggle
    this.themeToggle.addEventListener("click", () => this.toggleTheme());

    // Character count
    this.messageInput.addEventListener("input", () => this.updateCharCount());

    // Post message
    this.sendBtn.addEventListener("click", () => this.postMessage());
    this.postBox.addEventListener("keydown", (e) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        (e.target === this.messageInput || e.target === this.authorInput)
      ) {
        e.preventDefault();
        this.postMessage();
      }
    });

    // Search
    this.searchBtn.addEventListener("click", () => this.performSearch());
    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.performSearch();
      }
    });
    this.searchInput.addEventListener("input", (e) => {
      const query = this.searchInput.value.trim();

      if (query === "" && this.isSearching) {
        this.clearSearchFilter();
        return;
      }

      this.debouncedLiveSearch(query);
    });
    this.clearSearch.addEventListener("click", () => this.clearSearchFilter());

    // Date filter
    this.dateFilter.addEventListener("change", () => this.filterByDate());
    this.clearDate.addEventListener("click", () => this.clearDateFilter());
    this.dateBtn.addEventListener("click", () => {
      if (this.dateFilter.showPicker) {
        this.dateFilter.showPicker();
      } else {
        this.dateFilter.click();
      }
    });

    // Delegated click for reply copy buttons
    document.addEventListener("click", (e) => {
      const copyBtn = e.target.closest(".copy-reply-btn");
      if (copyBtn) {
        e.stopPropagation();
        const text = copyBtn.dataset.copyText;
        if (text) this.copyToClipboard(text);
      }
    });

    // Load More
    this.loadMoreBtn.addEventListener("click", () => this.loadMoreMessages());

    // Back to Top
    this.backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", () => this.toggleBackToTop());

    // Infinitie scroll
    window.addEventListener(
      "scroll",
      this.debounce(() => this.checkInfiniteScroll(), 150)
    );
  }

  // ============ THEME ================
  loadTheme() {
    const savedTheme = localStorage.getItem("begooyar-theme") || "light";
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(`theme-${savedTheme}`);
    this.updateThemeIcon();
    this.updateFavicon(savedTheme);
  }

  updateThemeIcon() {
    const isDark = document.body.classList.contains("theme-dark");
    this.themeIcon.innerHTML = isDark
      ? `<svg class="icon-regular" viewBox="0 0 24 24">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
        </svg>`
      : `<svg class="icon-regular" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4"/>
      </svg>`;
  }

  toggleTheme() {
    const isLight = document.body.classList.contains("theme-light");
    const newTheme = isLight ? "dark" : "light";

    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(`theme-${newTheme}`);

    this.updateThemeIcon();
    this.updateFavicon(newTheme);
    localStorage.setItem("begooyar-theme", newTheme);
    this.showToast(
      newTheme === "light" ? "تم روشن فعال شد" : "تم تاریک فعال شد"
    );
  }

  // ============ FAVICON ===============
  updateFavicon(theme) {
    const accent = theme === "dark" ? "6c5ce7" : "e17055";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#${accent}"/>
      <path d="M6 8h12M6 12h8M6 16h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

    const existingLink = document.querySelector("link[rel='icon']");
    if (existingLink) existingLink.remove();

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    document.head.appendChild(link);
  }

  // ========== INPUT HANDLERS ==========
  updateCharCount() {
    const length = this.messageInput.value.length;
    this.charCount.textContent = `${length}/1000`;

    if (length > 950) {
      this.charCount.style.color = "var(--error)";
    } else if (length > 900) {
      this.charCount.style.color = "var(--warning)";
    } else {
      this.charCount.style.color = "";
    }
  }

  // ============== API / DATA ===============
  async loadMessages(reset = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    const clearSkeletons = () => {
      this.feed.querySelectorAll(".skeleton-card").forEach((el) => el.remove());
    };

    if (reset) {
      this.currentOffset = 0;
      this.hasMore = true;
      this.totalLoaded = 0;
      this.feed.innerHTML = "";
      this.showSkeletons();
    } else {
      this.showLoading(true);
    }

    try {
      if (!this.hasMore && !reset) return;

      let url;

      if (this.isSearching) {
        url = `${this.apiBase}/api/search?q=${encodeURIComponent(
          this.currentSearchTerm
        )}&offset=${this.currentOffset}&limit=${this.limit}`;
      } else if (this.isFilteringByDate) {
        url = `${this.apiBase}/api/date?day=${this.currentDate}&offset=${this.currentOffset}&limit=${this.limit}`;
      } else {
        url = `${this.apiBase}/api/messages?offset=${this.currentOffset}&limit=${this.limit}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load messages");

      const messages = await response.json();

      if (reset) {
        clearSkeletons();
      }

      if (messages.length === 0) {
        this.hasMore = false;
        this.loadMore.style.display = "none";

        if (reset) this.showEmptyState();
        return;
      }

      messages.forEach((message) => {
        this.createMessageCard(message);
      });

      this.totalLoaded += messages.length;

      this.currentOffset += messages.length;
      this.hasMore = messages.length === this.limit;
      this.loadMore.style.display = this.hasMore ? "block" : "none";

      this.updateFeedStatus(this.totalLoaded);
    } catch (error) {
      console.error("Error loading messages:", error);
      this.showPostError("اشکال درنمایش پیام ها، بعداً بیا.");
      clearSkeletons();
      this.feed.innerHTML = "";
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  async loadMoreMessages() {
    await this.loadMessages();
  }

  // ========= MESSAGE CARD CREATION ==========
  createMessageCard(message) {
    const card = document.createElement("div");
    card.className = "message-card";
    card.dataset.id = message.id;

    const date = new Date(message.timestamp);
    const formattedDate = this.formatDate(date);

    card.innerHTML = `
    <div class="message-preview collapsed">
      <div class="message-text">${this.escapeHtml(message.text)}</div>
    </div>
    <div class="card-meta-section">
      <div class="author">
        ${this.escapeHtml(message.author)}
      </div>
      <div class="card-bottom">
        <div class="card-meta">
          <div class="stats">
            <span>
              <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>
              </svg>
              <small class="view-count" style="min-width: 1.5rem; display: inline-block;">${this.formatCount(
                message.views || 0
              )}</small>
            </span>
            <span>
              <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
                <path d="M12 4c-4.97 0-9 3.36-9 7.5 0 2.27 1.23 4.3 3.2 5.67L5 21l4.24-2.12c.88.2 1.8.32 2.76.32 4.97 0 9-3.36 9-7.5S16.97 4 12 4z"/>
              </svg>
              <small class="reply-count" style="min-width: 1.5rem; display: inline-block;">${this.formatCount(
                message.replies ? message.replies.length : 0
              )}</small>
            </span>
          </div>
          <div class="timestamp">${formattedDate}</div>
        </div>

        <div class="card-actions">
          <button class="action-btn copy-btn" title="کپی پیام">
            <svg class="icon-regular" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button class="action-btn reply-toggle-btn" title="پاسخ">
            <svg class="icon-regular" viewBox="0 2 24 24">
              <path d="M9 17l-5-5 5-5"/>
              <path d="M4 12h12a5 5 0 0 1 0 10h-2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  
    <div class="replies-section">
      <div class="replies-header">پاسخ‌ها</div>
      <div class="replies-container">
        ${
          message.replies && message.replies.length > 0
            ? message.replies
                .map((reply) => this.createReplyHtml(reply))
                .join("")
            : '<p class="no-replies">هنوز پاسخی نیست...</p>'
        }
      </div>
    </div>

    <div class="reply-input-container">
    <textarea class="reply-textarea" placeholder="پاسخ شما..." maxlength="400"></textarea>
      <div class="reply-footer">
        <input type="text" class="reply-author-input" placeholder="نام تو (اختیاری)" maxlength="30">
        <div class="reply-actions">
          <button class="cancel-reply-btn">لغو</button>
          <button class="reply-btn">فرستادن</button>
        </div>
      </div>
    </div>
    `;

    // Elements
    const preview = card.querySelector(".message-preview");
    const repliesSec = card.querySelector(".replies-section");
    const replyInput = card.querySelector(".reply-input-container");
    const replyTextarea = card.querySelector(".reply-textarea");
    const replyAuthorInput = card.querySelector(".reply-author-input");

    // Expand Card & Increment Views
    card.addEventListener("click", async (e) => {
      if (
        e.target.closest(".action-btn") ||
        e.target.closest(".reply-input-container") ||
        e.target.closest(".copy-reply-btn")
      )
        return;

      const isOpening = preview.classList.contains("collapsed");

      this.closeOtherCards(card);

      // Toggle Current
      preview.classList.toggle("collapsed");
      preview.classList.toggle("expanded");
      preview.classList.contains("expanded")
        ? repliesSec.classList.add("active")
        : repliesSec.classList.remove("active");

      if (isOpening) {
        // Scroll to card if opening
        setTimeout(() => {
          const header = document.querySelector(".feed-header");
          const headerHeight = header ? header.offsetHeight : 0;

          const y =
            card.getBoundingClientRect().top +
            window.scrollY -
            headerHeight -
            30;

          window.scrollTo({
            top: y,
            behavior: "smooth",
          });
        }, 400); // Same as card collapsing transition duration

        // Increment View on Backend
        fetch(`${this.apiBase}/api/view`, {
          method: "POST",
          body: JSON.stringify({ id: message.id }),
          headers: { "Content-Type": "application/json" },
        });
        const countEl = card.querySelector(".view-count");
        const currentCount = parseInt(countEl.textContent) || 0;
        countEl.textContent = this.formatCount(currentCount + 1);
      }
    });

    // Toggle Reply Input (Separate from Section)
    card.querySelector(".reply-toggle-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      // Close other inputs
      document
        .querySelectorAll(".reply-input-container.active")
        .forEach((el) => {
          if (el !== replyInput) el.classList.remove("active");
        });
      replyInput.classList.toggle("active");
      if (replyInput.classList.contains("active")) replyTextarea.focus();
    });

    // Copy Logic
    card.querySelector(".copy-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      this.copyToClipboard(message.text);
    });

    // Post Reply
    card.querySelector(".reply-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const author = replyAuthorInput.value;
      this.postReply(message.id, replyTextarea.value, author);
    });

    // Enter to Reply
    replyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const isTextarea = e.target === replyTextarea;
        const isAuthorInput = e.target === replyAuthorInput;

        if (isTextarea || isAuthorInput) {
          e.preventDefault();
          const author = replyAuthorInput.value;
          this.postReply(message.id, replyTextarea.value, author);
        }
      }
    });

    // Cancel
    card.querySelector(".cancel-reply-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      replyInput.classList.remove("active");
    });

    this.feed.appendChild(card);
  }

  createReplyHtml(reply) {
    return `
      <div class="reply-card">
        <div class="reply-meta">
          <span class="reply-author">
            ${this.escapeHtml(reply.author)}
          </span>
          <button class="copy-reply-btn allunset" data-copy-text="${this.escapeHtml(
            reply.text
          ).replace(/"/g, "&quot;")}">
            <svg class="icon-solid" viewBox="0 0 24 24">
              <rect x="4" y="4" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
              <rect x="9" y="9" width="13" height="13" rx="2" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
        <div class="reply-text">${this.escapeHtml(reply.text)}</div>
      </div>
    `;
  }

  // ========== POSTING ==========
  async postMessage() {
    const text = this.messageInput.value.trim();
    const author = this.authorInput.value.trim();

    // Validation
    if (!text) {
      this.showPostError("پیامت کو؟");
      return;
    }

    if (text.length > 1000) {
      this.showPostError("پیام نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد");
      return;
    }

    this.showPostError("");
    this.sendBtn.disabled = true;
    this.sendBtn.innerHTML = '<div class="loading-spinner white"></div>';

    try {
      const response = await fetch(`${this.apiBase}/api/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          author: author || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "پیامت نرفت");
      }

      // Clear inputs
      this.messageInput.value = "";
      this.authorInput.value = "";
      this.updateCharCount();

      // Show success
      this.showToast("پیامت رفت!");

      // Reload messages
      if (!this.isSearching && !this.isFilteringByDate) {
        this.loadMessages(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      console.error("Error posting message:", error);
      this.showPostError(error.message);
      this.showToast(error.message, "error");
    } finally {
      this.sendBtn.disabled = false;
      this.sendBtn.innerHTML = "فرستادن";
    }
  }

  async postReply(messageId, text, author) {
    if (!text.trim()) return;

    text = text.trim();

    if (!text) {
      this.showToast("لطفاً پاسخ خود را بنویسید", "error");
      return;
    }

    if (text.length > 400) {
      this.showToast("پاسخ نمی‌تواند بیشتر از ۴۰۰ کاراکتر باشد", "error");
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/api/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, text, author }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Find the card and update it without full reload
      const card = document.querySelector(
        `.message-card[data-id="${messageId}"]`
      );
      if (card) {
        // Create new reply element
        const repliesContainer = card.querySelector(".replies-container");
        const noRepliesMsg = repliesContainer.querySelector(".no-replies");
        if (noRepliesMsg) noRepliesMsg.remove();

        const newReplyHtml = this.createReplyHtml(data);
        repliesContainer.insertAdjacentHTML("beforeend", newReplyHtml);

        // Update reply count
        const replyCountEl = card.querySelector(".reply-count");
        const currentCount = parseInt(replyCountEl.textContent) || 0;
        replyCountEl.textContent = this.formatCount(currentCount + 1);

        // Clear input and keep section open
        card.querySelector(".reply-textarea").value = "";
        card.querySelector(".reply-author-input").value = "";
        card.querySelector(".replies-section").classList.add("active");

        const preview = card.querySelector(".message-preview");
        preview.classList.remove("collapsed");
        preview.classList.add("expanded");
      }

      this.showToast("پاسخ ثبت شد");
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  // ========== SEARCH & FILTERS ==========
  async performSearch() {
    const query = this.searchInput.value.trim();

    if (!query) {
      this.showToast("لطفاً عبارت مورد نظر را وارد کنید", "warning");
      return;
    }

    this.isSearching = true;
    this.currentSearchTerm = query;

    this.isFilteringByDate = false;
    this.currentDate = "";
    this.dateFilter.value = "";
    this.clearDate.classList.remove("visible");
    this.clearSearch.classList.add("visible");

    await this.loadMessages(true);
    this.scrollToFeed();
    this.showToast(`جستجو برای: ${query}`);
  }

  clearSearchFilter() {
    clearTimeout(this._liveSearchTimeout);
    this.isSearching = false;
    this.currentSearchTerm = "";
    this.searchInput.value = "";
    this.clearSearch.classList.remove("visible");
    this.hasMore = true;
    this.loadMessages(true);
    this.scrollToFeed();
  }

  async filterByDate() {
    clearTimeout(this._liveSearchTimeout);
    const date = this.dateFilter.value;

    if (!date) {
      this.clearDateFilter();
      return;
    }

    this.isSearching = false;
    this.currentSearchTerm = "";
    this.searchInput.value = "";
    this.clearSearch.classList.remove("visible");

    this.isFilteringByDate = true;
    this.currentDate = date;
    this.currentOffset = 0;
    this.clearDate.classList.add("visible");

    await this.loadMessages(true);
    this.scrollToFeed();
    this.showToast(`پیام‌های تاریخ: ${this.formatDate(date)}`);
  }

  clearDateFilter() {
    this.isFilteringByDate = false;
    this.currentDate = "";
    this.dateFilter.value = "";
    this.clearDate.classList.remove("visible");
    this.hasMore = true;
    this.loadMessages(true);
    this.showToast("فیلتر تاریخ پاک شد");
    this.scrollToFeed();
  }

  debouncedLiveSearch(query) {
    if (this._liveSearchTimeout) {
      clearTimeout(this._liveSearchTimeout);
    }

    this._liveSearchTimeout = setTimeout(() => {
      if (query.length > 0) {
        this.performSearch();
      }
    }, 400);
  }

  // ========== UI HELPERS ==========
  showLoading(show) {
    if (show) {
      this.loadingSpinner.style.display = "block";
      this.feedStatus.textContent = "لودینگ...";
    } else {
      this.loadingSpinner.style.display = "none";
    }
  }

  updateFeedStatus(count) {
    const targetText = this.isSearching
      ? `${count} پیام پیدا شد`
      : this.isFilteringByDate
      ? `${count} پیام در این تاریخ`
      : `${count} پیام بارگذاری شده`;

    // A bit of transition
    this.feedStatus.style.opacity = "0";

    setTimeout(() => {
      this.feedStatus.textContent = targetText;
      this.feedStatus.style.opacity = "1";
    }, 200);
  }

  showEmptyState() {
    this.updateFeedStatus(0);
    this.feed.innerHTML = `
      <div class="empty-state">
          <h3>همچین پیامی نیست</h3>
          <p>دنبال یه چیزِ دیگه باش...</p>
      </div>
    `;
  }

  showPostError(message) {
    this.postError.textContent = message;
    this.postError.style.display = message ? "block" : "none";
  }

  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "alert");
    toast.textContent = message;

    if (type === "error") {
      toast.style.borderLeftColor = "var(--error)";
    } else if (type === "warning") {
      toast.style.borderLeftColor = "var(--warning)";
    } else {
      toast.style.borderLeftColor = "var(--success)";
    }

    document.body.appendChild(toast);

    // Force reflow
    toast.offsetHeight;
    toast.classList.add("show");

    // Remove after animation
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async copyToClipboard(text) {
    const cleanText = (text || "").trim();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cleanText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = cleanText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }

      this.showToast("پیام کپی شد");
    } catch (err) {
      console.error("Failed to copy:", err);
      this.showToast("خطا در کپی کردن", "error");
    }
  }

  showSkeletons() {
    const skeletonHTML = Array(6)
      .fill(
        `
    <div class="skeleton-card">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    </div>
  `
      )
      .join("");
    this.feed.innerHTML = skeletonHTML;
  }

  // ========== UTILITIES ==========
  formatDate(dateInput) {
    // If it's a string like "YYYY-MM-DD", parse it to a local Date
    let date;
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      const [year, month, day] = dateInput.split("-").map(Number);
      date = new Date(year, month - 1, day);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return "";
    }

    // Format as YYYY/MM/DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }

  formatCount(count) {
    if (count >= 100) return "99+";
    return count || 0;
  }

  closeOtherCards(currentCard) {
    document.querySelectorAll(".message-card").forEach((card) => {
      if (card !== currentCard) {
        card.querySelector(".message-preview").className =
          "message-preview collapsed";
        card.querySelector(".replies-section").classList.remove("active");
        card.querySelector(".reply-input-container").classList.remove("active");
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  scrollToFeed() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document
          .querySelector(".feed-container")
          .scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  // ========== SCROLL BEHAVIOUR ==========
  toggleBackToTop() {
    if (window.scrollY > 300) {
      this.backToTop.classList.add("show");
    } else {
      this.backToTop.classList.remove("show");
    }
  }

  checkInfiniteScroll() {
    if (this.isLoading || !this.hasMore) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    if (scrollPosition >= pageHeight - 100) {
      this.loadMoreMessages();
    }
  }

  debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }
}

// Initialize the application
let begooYar;

document.addEventListener("DOMContentLoaded", () => {
  begooYar = new BegooYar();
});
