// Main JavaScript for B2B Travel Marketing System

// Global variables
let tripCounter = 0;
let currentQuoteData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
});

// Initialize form with default state
function initializeForm() {
    const outputType = document.getElementById('outputType');
    const quotationFields = document.getElementById('quotationFields');
    
    // Hide quotation fields initially
    quotationFields.classList.add('hidden');
    
    // Add change listener for output type
    outputType.addEventListener('change', handleOutputTypeChange);
}

// Setup all event listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('marketingForm').addEventListener('submit', handleFormSubmit);
    
    // Add trip button
    document.getElementById('addTrip').addEventListener('click', addTripField);
    
    // Copy URL button
    document.getElementById('copyUrl').addEventListener('click', copyGeneratedUrl);
    
    // New generation button
    document.getElementById('newGeneration').addEventListener('click', resetForm);
}

// Handle output type change
function handleOutputTypeChange(event) {
    const quotationFields = document.getElementById('quotationFields');
    const targetCompany = document.getElementById('targetCompany');
    
    if (event.target.value === 'quotation') {
        quotationFields.classList.remove('hidden');
        // Add default trip if none exist
        if (tripCounter === 0) {
            addTripField();
        }
    } else {
        quotationFields.classList.add('hidden');
    }
}

// Add a new trip field
function addTripField() {
    tripCounter++;
    const container = document.getElementById('tripContainer');
    
    const tripItem = document.createElement('div');
    tripItem.className = 'trip-item';
    tripItem.id = `trip-${tripCounter}`;
    tripItem.innerHTML = `
        <div class="row">
            <div class="col-md-5">
                <label class="form-label">Trip Name</label>
                <input type="text" class="form-control trip-name" placeholder="Enter trip name..." required>
            </div>
            <div class="col-md-5">
                <label class="form-label">Price</label>
                <input type="number" class="form-control trip-price" placeholder="0.00" min="0" step="0.01" required>
            </div>
            <div class="col-md-2 d-flex align-items-end">
                <button type="button" class="btn btn-remove" onclick="removeTrip(${tripCounter})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-12">
                <label class="form-label">Description</label>
                <textarea class="form-control trip-description" rows="2" placeholder="Enter trip description..."></textarea>
            </div>
        </div>
    `;
    
    container.appendChild(tripItem);
    
    // Add event listeners for price calculation
    const priceInput = tripItem.querySelector('.trip-price');
    priceInput.addEventListener('input', calculateTotal);
    
    // Add event listener for description auto-fill
    const nameInput = tripItem.querySelector('.trip-name');
    nameInput.addEventListener('input', function() {
        const description = tripItem.querySelector('.trip-description');
        if (!description.value) {
            description.value = `Professional travel package for ${this.value}`;
        }
    });
}

// Remove a trip field
function removeTrip(tripId) {
    const tripItem = document.getElementById(`trip-${tripId}`);
    if (tripItem) {
        tripItem.remove();
        calculateTotal();
    }
}

// Calculate total price
function calculateTotal() {
    const priceInputs = document.querySelectorAll('.trip-price');
    let subtotal = 0;
    
    priceInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        subtotal += value;
    });
    
    // Calculate taxes (10% for demonstration)
    const taxes = subtotal * 0.1;
    const finalTotal = subtotal + taxes;
    
    // Update display
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('finalTotal').textContent = finalTotal.toFixed(2);
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const outputType = formData.get('outputType');
    const targetCompany = formData.get('targetCompany');
    
    if (!outputType || !targetCompany) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Show loading state
    showLoadingState();
    
    try {
        let result;
        
        if (outputType === 'company-profile') {
            result = await generateCompanyProfile(targetCompany);
        } else if (outputType === 'quotation') {
            result = await generateQuotation(targetCompany);
        }
        
        if (result && result.url) {
            showResultState(result.url);
        } else {
            throw new Error('Failed to generate URL');
        }
        
    } catch (error) {
        console.error('Error generating marketing material:', error);
        alert('An error occurred while generating the marketing material. Please try again.');
        hideLoadingState();
    }
}

// Generate company profile
async function generateCompanyProfile(targetCompany) {
    // Create company profile data
    const profileData = {
        target_company: targetCompany,
        created_at: new Date().toISOString(),
        status: 'active'
    };
    
    try {
        // Save to database
        const response = await fetch('/tables/company_profiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save company profile');
        }
        
        const result = await response.json();
        const profileId = result.id;
        
        // Generate URL
        const profileUrl = `company-profile.html?company=${encodeURIComponent(targetCompany)}&id=${profileId}`;
        
        // Update the record with the generated URL
        await fetch(`/tables/company_profiles/${profileId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profile_url: profileUrl
            })
        });
        
        return {
            url: profileUrl,
            id: profileId
        };
        
    } catch (error) {
        console.error('Error generating company profile:', error);
        throw error;
    }
}

// Generate quotation
async function generateQuotation(targetCompany) {
    // Collect trip data
    const tripData = [];
    const tripItems = document.querySelectorAll('.trip-item');
    
    tripItems.forEach(item => {
        const name = item.querySelector('.trip-name').value;
        const price = parseFloat(item.querySelector('.trip-price').value) || 0;
        const description = item.querySelector('.trip-description').value || `Professional travel package for ${name}`;
        
        if (name && price > 0) {
            tripData.push({
                name: name,
                price: price,
                description: description
            });
        }
    });
    
    if (tripData.length === 0) {
        throw new Error('Please add at least one trip with a valid price');
    }
    
    // Calculate totals
    const subtotal = tripData.reduce((sum, trip) => sum + trip.price, 0);
    const taxes = subtotal * 0.1; // 10% tax
    const finalTotal = subtotal + taxes;
    
    // Create quotation data
    const quotationData = {
        target_company: targetCompany,
        trips: tripData,
        subtotal: subtotal,
        final_total: finalTotal,
        created_at: new Date().toISOString(),
        status: 'active'
    };
    
    try {
        // Save to database
        const response = await fetch('/tables/quotations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quotationData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save quotation');
        }
        
        const result = await response.json();
        const quotationId = result.id;
        
        // Generate URL
        const quotationUrl = `quotation.html?company=${encodeURIComponent(targetCompany)}&quote=${quotationId}`;
        
        // Update the record with the generated URL
        await fetch(`/tables/quotations/${quotationId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quotation_url: quotationUrl
            })
        });
        
        return {
            url: quotationUrl,
            id: quotationId
        };
        
    } catch (error) {
        console.error('Error generating quotation:', error);
        throw error;
    }
}

// Show loading state
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('marketingForm').style.display = 'none';
}

// Hide loading state
function hideLoadingState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('marketingForm').style.display = 'block';
}

// Show result state
function showResultState(url) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('resultState').classList.remove('hidden');
    document.getElementById('generatedUrl').textContent = window.location.origin + '/' + url;
    
    // Store the URL for copying
    currentGeneratedUrl = window.location.origin + '/' + url;
}

// Copy generated URL to clipboard
function copyGeneratedUrl() {
    if (currentGeneratedUrl) {
        navigator.clipboard.writeText(currentGeneratedUrl).then(function() {
            // Show success message
            const button = document.getElementById('copyUrl');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied!';
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');
            
            // Reset after 2 seconds
            setTimeout(function() {
                button.innerHTML = originalText;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-primary');
            }, 2000);
        }).catch(function(err) {
            console.error('Could not copy text: ', err);
            alert('Could not copy URL. Please copy manually: ' + currentGeneratedUrl);
        });
    }
}

// Reset form for new generation
function resetForm() {
    document.getElementById('marketingForm').reset();
    document.getElementById('resultState').classList.add('hidden');
    document.getElementById('marketingForm').style.display = 'block';
    document.getElementById('tripContainer').innerHTML = '';
    tripCounter = 0;
    calculateTotal();
}

// Utility function to generate unique IDs
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

// Export functions for global use (for onclick handlers)
window.removeTrip = removeTrip;