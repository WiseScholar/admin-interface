document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = "http://localhost:5000"; // Change for deployment

    const studentTableBody = document.getElementById("student-table-body");
    const totalStudents = document.getElementById("total-students");
    const readyTranscripts = document.getElementById("ready-transcripts");
    const readyRecommendations = document.getElementById("ready-recommendations"); 
    const addStudentForm = document.getElementById("add-student-form");
    const addStudents = document.querySelector(".addStudents");
    const addStudentsDialog = document.querySelector(".add-students-dialog");
    const btnClose = document.querySelector(".close");
    const loader = document.querySelector(".load");
    const themeToggle = document.getElementById("themeToggle");
    const settingsModal = document.getElementById("settingsModal");

    function safeAddEventListener(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    // Dark Mode Toggle
    if (themeToggle) {
        if (localStorage.getItem("darkMode") === "true") {
            document.body.classList.add("dark-mode");
            themeToggle.checked = true;
        }

        themeToggle.addEventListener("change", () => {
            document.body.classList.toggle("dark-mode", themeToggle.checked);
            localStorage.setItem("darkMode", themeToggle.checked ? "true" : "false");
        });
    }

    // Show Add Student Dialog
    safeAddEventListener(addStudents, "click", () => {
        addStudentsDialog.classList.add("active");
        addStudentsDialog.removeAttribute("inert");
    });

    // Close Dialog
    safeAddEventListener(btnClose, "click", () => {
        addStudentsDialog.classList.remove("active");
        addStudentsDialog.setAttribute("inert", "");
    });

    // Prevent ARIA Focus Issues on Hidden Modals
    if (settingsModal) {
        settingsModal.setAttribute("inert", "");
        settingsModal.addEventListener("shown.bs.modal", () => settingsModal.removeAttribute("inert"));
        settingsModal.addEventListener("hidden.bs.modal", () => settingsModal.setAttribute("inert", ""));
    }

    // Hide Loader Initially
    if (loader) loader.classList.remove("active");

    async function fetchJSON(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Fetch error on ${url}:`, error);
            return { error: error.message };
        }
    }

    async function fetchStudents() {
        if (!studentTableBody) return;
        
        studentTableBody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

        const data = await fetchJSON(`${API_BASE_URL}/students`);
        if (data.error) {
            studentTableBody.innerHTML = "<tr><td colspan='6'>⚠️ Error loading data. Try again.</td></tr>";
            return;
        }

        studentTableBody.innerHTML = "";
        let transcriptCount = 0;
        let recommendationCount = 0;

        data.forEach((student, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.request_type}</td>
                <td>${student.request_ready ? "✅ Ready" : "❌ Not Ready"}</td>
                <td>
                ${!student.request_ready 
                    ? `<button class="mark-ready" data-id="${student.id}">Mark Ready</button>` 
                    : `<button class="delete-student btn btn-danger" data-id="${student.id}">Delete</button>`}
                </td>
            `;
            studentTableBody.appendChild(row);

            if (student.request_ready) {
                if (student.request_type === "transcript") {
                    transcriptCount++;
                } else if (student.request_type === "recommendation_letter") {
                    recommendationCount++;
                }
            }
        });

        if (totalStudents) totalStudents.textContent = data.length;
        if (readyTranscripts) readyTranscripts.textContent = transcriptCount;
        if (readyRecommendations) readyRecommendations.textContent = recommendationCount; // NEW
    }

    if (studentTableBody) fetchStudents();

    safeAddEventListener(addStudentForm, "submit", async function (e) {
        e.preventDefault();

        const submitBtn = addStudentForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        if (loader) loader.classList.add("active");

        const name = document.getElementById("student-name").value.trim();
        const email = document.getElementById("student-email").value.trim();
        const requestType = document.getElementById("request-type").value.trim();

        if (!name || !email || !requestType) {
            alert("All fields are required.");
            submitBtn.disabled = false;
            if (loader) loader.classList.remove("active");
            return;
        }

        const data = await fetchJSON(`${API_BASE_URL}/add-student`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, request_type: requestType })
        });

        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            alert("Student added successfully!");
            addStudentForm.reset();
            fetchStudents();
            addStudentsDialog.classList.remove("active");
            addStudentsDialog.setAttribute("inert", "");
        }

        submitBtn.disabled = false;
        if (loader) loader.classList.remove("active");
    });

    safeAddEventListener(studentTableBody, "click", function (e) {
        const target = e.target;
        const studentId = target.getAttribute("data-id");
        
        if (!studentId) return;
    
        if (target.classList.contains("mark-ready")) {
            markStudentReady(studentId, target);
        } else if (target.classList.contains("delete-student")) {
            deleteStudent(studentId, target);
        }
    });
    
    async function markStudentReady(studentId, button) {
        button.disabled = true;
        if (loader) loader.classList.add("active");

        const data = await fetchJSON(`${API_BASE_URL}/mark-ready`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        });

        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            fetchStudents();
        }

        button.disabled = false;
        if (loader) loader.classList.remove("active");
    }
    
    async function deleteStudent(studentId, button) {
        if (!confirm("Are you sure you want to delete this student?")) return;
    
        button.disabled = true;
        if (loader) loader.classList.add("active");

        const data = await fetchJSON(`${API_BASE_URL}/delete-student`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        });

        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            fetchStudents();
        }

        button.disabled = false;
        if (loader) loader.classList.remove("active");
    }
});
