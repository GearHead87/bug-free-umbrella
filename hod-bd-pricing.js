// Optimized Country-Based Pricing for Framer Website
// Add this to Framer's Custom Code section (End of <head> tag)

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    API_TIMEOUT: 3000, // 3 seconds timeout
    
    // Pricing selectors based on your DOM structure
    PRICING_ELEMENTS: {
      // Branding plan pricing elements
      branding: {
        // Main price: "USD 897" 
        mainPrice: 'h3:contains("Branding")',
        // Monthly price: "USD 448/month"
        monthlyPrice: 'h3:contains("USD 448/month")',
        // Save text: "SAVE USD 448/mo for 2 months!"
        saveText: 'p:contains("SAVE USD 448/mo")'
      },
      
      // Brand+Video plan pricing elements  
      brandVideo: {
        // Main price: "USD 1279"
        mainPrice: 'h3:contains("Brand+video")',
        // Monthly price: "USD 448/month" (same as branding)
        monthlyPrice: 'h3:contains("Brand+video") + div + div + div h3:contains("USD 448/month")',
        // Save text: "SAVE USD 648/mo for 2 months!"
        saveText: 'p:contains("SAVE USD 648/mo")'
      },
      
      // Video plan pricing elements
      video: {
        // Main price: "USD 997"  
        mainPrice: 'h3:contains("video USD 997")',
        // Monthly price: "498/month"
        monthlyPrice: 'h3:contains("498/month")',
        // Save text: "SAVE USD 498/mo for 2 months!"
        saveText: 'p:contains("SAVE USD 498/mo")'
      }
    }
  };

  // Default pricing (existing)
  const DEFAULT_PRICING = {
    branding: {
      mainPrice: 897,
      monthlyPrice: 448,
      savings: 448,
      currency: 'USD',
      symbol: '$'
    },
    brandVideo: {
      mainPrice: 1279,
      monthlyPrice: 448, // Same as branding
      savings: 648,
      currency: 'USD', 
      symbol: '$'
    },
    video: {
      mainPrice: 997,
      monthlyPrice: 498,
      savings: 498,
      currency: 'USD',
      symbol: '$'
    }
  };

  // Australia pricing
  const AUSTRALIA_PRICING = {
    branding: {
      mainPrice: 1500,
      monthlyPrice: 750, // Half of main price for monthly
      savings: 750,
      currency: 'AUD',
      symbol: 'A$'
    },
    brandVideo: {
      mainPrice: 3500,
      monthlyPrice: 1750, // Half of main price for monthly
      savings: 1750,
      currency: 'AUD',
      symbol: 'A$'
    },
    video: {
      mainPrice: 2500, // Enterprise pricing for Australia
      monthlyPrice: 1250,
      savings: 1250,
      currency: 'AUD',
      symbol: 'A$'
    }
  };

  // Bangladesh pricing
  const BANGLADESH_PRICING = {
    branding: {
      mainPrice: 5000,
      monthlyPrice: 2500, // Half of main price for monthly
      savings: 2500,
      currency: 'BDT',
      symbol: '৳'
    },
    brandVideo: {
      mainPrice: 10000,
      monthlyPrice: 5000, // Half of main price for monthly
      savings: 5000,
      currency: 'BDT',
      symbol: '৳'
    },
    video: {
      mainPrice: 'Enterprise', // Enterprise pricing for Bangladesh
      monthlyPrice: 'Contact us',
      savings: 'Custom',
      currency: 'BDT',
      symbol: '৳'
    }
  };

  // Utility functions
  const utils = {
    log: (message, data = null) => {
      console.log(`[CountryPricing] ${message}`, data || '');
    },

    error: (message, error = null) => {
      console.error(`[CountryPricing] ${message}`, error || '');
    },

    // Get cached country data
    getCachedCountry: () => {
      try {
        const cached = localStorage.getItem('userCountryData');
        const timestamp = localStorage.getItem('userCountryTimestamp');
        
        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp);
          if (age < CONFIG.CACHE_DURATION) {
            return JSON.parse(cached);
          }
        }
      } catch (error) {
        utils.error('Error reading country cache', error);
      }
      return null;
    },

    // Store country data in cache
    setCachedCountry: (countryData) => {
      try {
        localStorage.setItem('userCountryData', JSON.stringify(countryData));
        localStorage.setItem('userCountryTimestamp', Date.now().toString());
        utils.log('Country data cached successfully', countryData);
      } catch (error) {
        utils.error('Error caching country data', error);
      }
    },

    // Wait for elements to be available
    waitForElements: (selector, timeout = 5000) => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        
        const check = () => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            resolve(elements);
          } else if (Date.now() - startTime < timeout) {
            setTimeout(check, 100);
          } else {
            resolve([]);
          }
        };
        
        check();
      });
    },

    // Find elements by text content
    findByText: (text, tag = '*') => {
      const xpath = `//${tag}[contains(text(), "${text}")]`;
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    },

    // Update text content while preserving HTML structure  
    updateTextContent: (element, oldText, newText) => {
      if (!element) return false;
      
      if (element.textContent.includes(oldText)) {
        element.textContent = element.textContent.replace(oldText, newText);
        return true;
      }
      
      // Try innerHTML replacement for complex structures
      if (element.innerHTML.includes(oldText)) {
        element.innerHTML = element.innerHTML.replace(oldText, newText);
        return true;
      }
      
      return false;
    }
  };

  // API functions for country detection
  const api = {
    // Fetch from ipapi.co
    fetchFromIpApi: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
      
      try {
        const response = await fetch('https://ipapi.co/json/', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.error) throw new Error(data.reason || 'API Error');
        
        return {
          countryCode: data.country_code,
          countryName: data.country_name,
          source: 'ipapi.co'
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },

    // Fetch from ip-api.com as fallback
    fetchFromIpApiCom: async () => {
      const controller = new AbortController(); 
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
      
      try {
        const response = await fetch('http://ip-api.com/json/', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.status === 'fail') throw new Error(data.message || 'API Error');
        
        return {
          countryCode: data.countryCode,
          countryName: data.country,
          source: 'ip-api.com'
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },

    // Try multiple APIs with fallback
    detectCountry: async () => {
      const apis = [api.fetchFromIpApi, api.fetchFromIpApiCom];

      for (const apiCall of apis) {
        try {
          const result = await apiCall();
          utils.log(`Country detected from ${result.source}`, result);
          return result;
        } catch (error) {
          utils.error(`API call failed`, error.message);
          continue;
        }
      }
      
      throw new Error('All location APIs failed');
    }
  };

  // DOM manipulation functions
  const dom = {
    // Update branding pricing
    updateBrandingPricing: (pricing) => {
      // Update main price "USD 897" to appropriate currency
      const brandingHeader = utils.findByText('Branding');
      if (brandingHeader) {
        const priceSpan = brandingHeader.querySelector('span[style*="color: rgb(182, 185, 59)"]');
        if (priceSpan) {
          utils.updateTextContent(priceSpan, 'USD 897', `${pricing.symbol}${pricing.mainPrice}`);
        }
        
        // Update monthly price "USD 448/month" 
        utils.updateTextContent(brandingHeader, 'USD 448/month', `${pricing.symbol}${pricing.monthlyPrice}/month`);
      }
      
      // Update save text "SAVE USD 448/mo for 2 months!"
      const saveElement = utils.findByText('SAVE USD 448/mo for 2 months!');
      if (saveElement) {
        utils.updateTextContent(saveElement, 'SAVE USD 448/mo for 2 months!', 
          `SAVE ${pricing.symbol}${pricing.savings}/mo for 2 months!`);
      }
    },

    // Update brand+video pricing
    updateBrandVideoPricing: (pricing) => {
      // Update main price "USD 1279" to appropriate currency
      const brandVideoHeader = utils.findByText('Brand+video');
      if (brandVideoHeader) {
        const priceSpan = brandVideoHeader.querySelector('span[style*="color: rgb(182, 185, 59)"]');
        if (priceSpan) {
          utils.updateTextContent(priceSpan, 'USD 1279', `${pricing.symbol}${pricing.mainPrice}`);
        }
        
        // Monthly price 
        utils.updateTextContent(brandVideoHeader, 'USD 448/month', `${pricing.symbol}${pricing.monthlyPrice}/month`);
      }
      
      // Update save text "SAVE USD 648/mo for 2 months!"
      const saveElement = utils.findByText('SAVE USD 648/mo for 2 months!');
      if (saveElement) {
        utils.updateTextContent(saveElement, 'SAVE USD 648/mo for 2 months!', 
          `SAVE ${pricing.symbol}${pricing.savings}/mo for 2 months!`);
      }
    },

    // Update video pricing
    updateVideoPricing: (pricing) => {
      // Update main price "USD 997" to appropriate currency or "Enterprise"
      const videoHeader = utils.findByText('video USD 997');
      if (videoHeader) {
        const priceSpan = videoHeader.querySelector('span[style*="color: rgb(182, 185, 59)"]');
        if (priceSpan) {
          if (pricing.mainPrice === 'Enterprise') {
            utils.updateTextContent(priceSpan, 'USD 997', 'Enterprise');
          } else {
            utils.updateTextContent(priceSpan, 'USD 997', `${pricing.symbol}${pricing.mainPrice}`);
          }
        }
        
        // Update monthly price "498/month"
        if (pricing.monthlyPrice === 'Contact us') {
          utils.updateTextContent(videoHeader, '498/month', 'Contact us');
        } else {
          utils.updateTextContent(videoHeader, '498/month', `${pricing.monthlyPrice}/month`);
        }
      }
      
      // Update save text "SAVE USD 498/mo for 2 months!"
      const saveElement = utils.findByText('SAVE USD 498/mo for 2 months!');
      if (saveElement) {
        if (pricing.savings === 'Custom') {
          utils.updateTextContent(saveElement, 'SAVE USD 498/mo for 2 months!', 
            'Custom pricing available!');
        } else {
          utils.updateTextContent(saveElement, 'SAVE USD 498/mo for 2 months!', 
            `SAVE ${pricing.symbol}${pricing.savings}/mo for 2 months!`);
        }
      }
    },

    // Apply all pricing updates
    applyPricing: (pricingData) => {
      utils.log('Applying pricing updates', pricingData);
      
      dom.updateBrandingPricing(pricingData.branding);
      dom.updateBrandVideoPricing(pricingData.brandVideo);
      dom.updateVideoPricing(pricingData.video);
      
      utils.log('Pricing updates completed');
    }
  };

  // Main pricing system
  const pricingSystem = {
    // Initialize the system
    init: async () => {
      utils.log('Initializing country-based pricing system');
      
      try {
        // Check cache first
        let countryData = utils.getCachedCountry();
        
        if (countryData) {
          utils.log('Using cached country data', countryData);
          pricingSystem.applyCountryPricing(countryData);
        }
        
        // Always try to get fresh data for accuracy (in background)
        try {
          const freshData = await api.detectCountry();
          utils.setCachedCountry(freshData);
          
          // Only update if different from cache or no cache
          if (!countryData || countryData.countryCode !== freshData.countryCode) {
            pricingSystem.applyCountryPricing(freshData);
          }
        } catch (error) {
          // If fresh fetch fails and no cache, do nothing (keep default USD pricing)
          if (!countryData) {
            utils.error('Country detection failed, keeping default pricing');
          }
        }
        
      } catch (error) {
        utils.error('Error during initialization', error);
      }
    },

    // Apply pricing based on country
    applyCountryPricing: (countryData) => {
      const { countryCode, countryName } = countryData;
      
      utils.log('Applying country-specific pricing', {
        country: `${countryName} (${countryCode})`
      });
      
      // Check country and apply appropriate pricing
      if (countryCode && countryCode.toUpperCase() === 'AU') {
        utils.log('Australia detected - applying AUD pricing');
        dom.applyPricing(AUSTRALIA_PRICING);
        
        // Store applied pricing info
        try {
          localStorage.setItem('appliedPricingRegion', 'AU');
          localStorage.setItem('appliedPricingCurrency', 'AUD');
        } catch (error) {
          utils.error('Error storing pricing info', error);
        }
      } else if (countryCode && countryCode.toUpperCase() === 'BD') {
        utils.log('Bangladesh detected - applying BDT pricing');
        dom.applyPricing(BANGLADESH_PRICING);
        
        // Store applied pricing info
        try {
          localStorage.setItem('appliedPricingRegion', 'BD');
          localStorage.setItem('appliedPricingCurrency', 'BDT');
        } catch (error) {
          utils.error('Error storing pricing info', error);
        }
      } else {
        utils.log('Other country - keeping default USD pricing');
        // Keep default pricing (no changes needed)
      }
    },

    // Manual refresh function
    refresh: async () => {
      utils.log('Manual refresh requested');
      try {
        localStorage.removeItem('userCountryData');
        localStorage.removeItem('userCountryTimestamp');
        localStorage.removeItem('appliedPricingRegion');
        localStorage.removeItem('appliedPricingCurrency');
      } catch (error) {
        utils.error('Error clearing cache', error);
      }
      
      // Reload page to reset to default pricing
      window.location.reload();
    },

    // Get current info
    getInfo: () => {
      try {
        return {
          country: utils.getCachedCountry(),
          region: localStorage.getItem('appliedPricingRegion') || 'DEFAULT',
          currency: localStorage.getItem('appliedPricingCurrency') || 'USD',
          cacheAge: Date.now() - parseInt(localStorage.getItem('userCountryTimestamp') || '0')
        };
      } catch (error) {
        utils.error('Error getting info', error);
        return null;
      }
    }
  };

  // Wait for DOM and initialize
  const initWhenReady = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(pricingSystem.init, 500); // Small delay for Framer to fully load
      });
    } else {
      setTimeout(pricingSystem.init, 500);
    }
  };

  // Expose global functions for testing
  window.CountryPricing = {
    refresh: pricingSystem.refresh,
    getInfo: pricingSystem.getInfo,
    clearCache: () => {
      try {
        localStorage.removeItem('userCountryData');
        localStorage.removeItem('userCountryTimestamp'); 
        localStorage.removeItem('appliedPricingRegion');
        localStorage.removeItem('appliedPricingCurrency');
        utils.log('Cache cleared successfully');
      } catch (error) {
        utils.error('Error clearing cache', error);
      }
    },
    forceAustralia: () => {
      const mockAusData = {
        countryCode: 'AU',
        countryName: 'Australia', 
        source: 'manual'
      };
      utils.setCachedCountry(mockAusData);
      pricingSystem.applyCountryPricing(mockAusData);
    },
    forceBangladesh: () => {
      const mockBdData = {
        countryCode: 'BD',
        countryName: 'Bangladesh', 
        source: 'manual'
      };
      utils.setCachedCountry(mockBdData);
      pricingSystem.applyCountryPricing(mockBdData);
    }
  };

  // Initialize
  initWhenReady();

})();
