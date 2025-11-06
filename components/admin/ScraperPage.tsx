import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, X, AlertCircle, CheckCircle, Loader, Play, RotateCcw } from 'lucide-react';
import {
  scrapeProductUrl,
  processScrapedShirt,
  isValidThreadlessProductUrl,
  type ScrapedShirt,
  type ScrapeProgress,
} from '../../services/scraperBrowserService';

interface ScrapedResult {
  url: string;
  status: 'success' | 'failed' | 'skipped';
  shirt?: ScrapedShirt;
  error?: string;
}

const ScraperPage: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [isScrapingActive, setIsScrapingActive] = useState(false);
  const [progress, setProgress] = useState<ScrapeProgress>({
    status: 'idle',
    currentUrl: '',
    currentIndex: 0,
    totalUrls: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
  });
  const [results, setResults] = useState<ScrapedResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // Add log message
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : '•';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  }, []);

  // Parse URLs from textarea
  const parseUrls = (input: string): string[] => {
    return input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setUrlInput(prev => prev + (prev ? '\n' : '') + text);
      addLog(`Loaded ${parseUrls(text).length} URLs from file: ${file.name}`, 'success');
    };
    reader.readAsText(file);
  };

  // Validate all URLs
  const validateUrls = (urls: string[]): { valid: string[]; invalid: string[] } => {
    const valid: string[] = [];
    const invalid: string[] = [];

    urls.forEach(url => {
      if (isValidThreadlessProductUrl(url)) {
        valid.push(url);
      } else {
        invalid.push(url);
      }
    });

    return { valid, invalid };
  };

  // Start scraping process
  const startScraping = async () => {
    const urls = parseUrls(urlInput);

    if (urls.length === 0) {
      addLog('No URLs provided', 'error');
      return;
    }

    // Validate URLs
    const { valid, invalid } = validateUrls(urls);

    if (invalid.length > 0) {
      addLog(`Found ${invalid.length} invalid URLs (will be skipped)`, 'warning');
      invalid.forEach(url => addLog(`Invalid URL: ${url}`, 'warning'));
    }

    if (valid.length === 0) {
      addLog('No valid Threadless URLs found', 'error');
      return;
    }

    // Reset state
    setResults([]);
    setLogs([]);
    setIsScrapingActive(true);
    setProgress({
      status: 'scraping',
      currentUrl: '',
      currentIndex: 0,
      totalUrls: valid.length,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });

    addLog(`Starting scraper with ${valid.length} URLs...`, 'info');

    // Process each URL
    for (let i = 0; i < valid.length; i++) {
      const url = valid[i];

      setProgress(prev => ({
        ...prev,
        currentUrl: url,
        currentIndex: i + 1,
      }));

      addLog(`[${i + 1}/${valid.length}] Scraping: ${url}`, 'info');

      try {
        // Step 1: Scrape the product page
        const scrapeResult = await scrapeProductUrl(url);

        if (!scrapeResult.success || !scrapeResult.shirt) {
          // Failed to scrape
          addLog(`Failed to scrape: ${scrapeResult.error}`, 'error');
          setResults(prev => [...prev, {
            url,
            status: 'failed',
            error: scrapeResult.error,
          }]);
          setProgress(prev => ({
            ...prev,
            failedCount: prev.failedCount + 1,
          }));
          continue;
        }

        const shirt = scrapeResult.shirt;
        addLog(`Scraped: "${shirt.title}" by ${shirt.designerName}`, 'success');

        // Step 2: Process the shirt (upload image and insert into DB)
        addLog(`Processing: "${shirt.title}"...`, 'info');
        const processResult = await processScrapedShirt(shirt);

        if (!processResult.success) {
          // Failed to process
          addLog(`Failed to process: ${processResult.error}`, 'error');
          setResults(prev => [...prev, {
            url,
            status: 'failed',
            shirt,
            error: processResult.error,
          }]);
          setProgress(prev => ({
            ...prev,
            failedCount: prev.failedCount + 1,
          }));
        } else if (processResult.skipped) {
          // Skipped (duplicate)
          addLog(`Skipped: "${shirt.title}" (already exists)`, 'warning');
          setResults(prev => [...prev, {
            url,
            status: 'skipped',
            shirt,
          }]);
          setProgress(prev => ({
            ...prev,
            skippedCount: prev.skippedCount + 1,
          }));
        } else {
          // Success
          addLog(`Successfully added: "${shirt.title}"`, 'success');
          setResults(prev => [...prev, {
            url,
            status: 'success',
            shirt,
          }]);
          setProgress(prev => ({
            ...prev,
            successCount: prev.successCount + 1,
          }));
        }

        // Add delay between requests (2 seconds)
        if (i < valid.length - 1) {
          addLog('Waiting 2 seconds before next request...', 'info');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`Error processing ${url}: ${errorMessage}`, 'error');
        setResults(prev => [...prev, {
          url,
          status: 'failed',
          error: errorMessage,
        }]);
        setProgress(prev => ({
          ...prev,
          failedCount: prev.failedCount + 1,
        }));
      }
    }

    // Complete
    setProgress(prev => ({ ...prev, status: 'complete' }));
    setIsScrapingActive(false);
    addLog(`Scraping complete! Success: ${progress.successCount}, Failed: ${progress.failedCount}, Skipped: ${progress.skippedCount}`, 'success');
  };

  // Clear all
  const clearAll = () => {
    setUrlInput('');
    setResults([]);
    setLogs([]);
    setProgress({
      status: 'idle',
      currentUrl: '',
      currentIndex: 0,
      totalUrls: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });
  };

  // Calculate progress percentage
  const progressPercentage = progress.totalUrls > 0
    ? Math.round((progress.currentIndex / progress.totalUrls) * 100)
    : 0;

  return (
    <motion.div
      className="p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Download className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Import Shirts from Threadless</h1>
        </div>
        <p className="text-gray-400">
          Paste Threadless product URLs below to scrape and import shirts into your inventory.
        </p>
      </div>

      {/* URL Input Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Product URLs</h2>
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm">Upload .txt file</span>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isScrapingActive}
            />
          </label>
        </div>

        <textarea
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste Threadless product URLs here (one per line)&#10;&#10;Example:&#10;https://www.threadless.com/shop/@artist/design/shirt-name/mens&#10;https://www.threadless.com/shop/@artist/design/another-shirt/mens&#10;&#10;# Lines starting with # are ignored"
          className="w-full h-48 bg-gray-900 text-white rounded-lg p-4 font-mono text-sm border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
          disabled={isScrapingActive}
        />

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-400">
            {parseUrls(urlInput).length} URL{parseUrls(urlInput).length !== 1 ? 's' : ''} ready to scrape
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearAll}
              disabled={isScrapingActive}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={startScraping}
              disabled={isScrapingActive || parseUrls(urlInput).length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScrapingActive ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Scraping
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {progress.status !== 'idle' && (
        <motion.div
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Progress</h2>
            <div className="text-sm text-gray-400">
              {progress.currentIndex} / {progress.totalUrls}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Current URL */}
          {progress.currentUrl && (
            <div className="text-sm text-gray-400 mb-4 truncate">
              Current: {progress.currentUrl}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <div className="text-green-400 text-2xl font-bold">{progress.successCount}</div>
              <div className="text-green-400/70 text-sm">Success</div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <div className="text-yellow-400 text-2xl font-bold">{progress.skippedCount}</div>
              <div className="text-yellow-400/70 text-sm">Skipped</div>
            </div>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <div className="text-red-400 text-2xl font-bold">{progress.failedCount}</div>
              <div className="text-red-400/70 text-sm">Failed</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Logs Section */}
      {logs.length > 0 && (
        <motion.div
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Activity Log</h2>
            <button
              onClick={() => setLogs([])}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear logs
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-gray-300 space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap break-all">
                {log}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <motion.div
          className="bg-gray-800 rounded-lg p-6 border border-gray-700"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Results</h2>

          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-900/20 border-green-700'
                    : result.status === 'skipped'
                    ? 'bg-yellow-900/20 border-yellow-700'
                    : 'bg-red-900/20 border-red-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : result.status === 'skipped' ? (
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <X className="w-5 h-5 text-red-400" />
                    )}
                  </div>

                  {/* Image (if available) */}
                  {result.shirt && (
                    <img
                      src={result.shirt.imageUrl}
                      alt={result.shirt.title}
                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                    />
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    {result.shirt ? (
                      <>
                        <div className="text-white font-medium truncate">
                          {result.shirt.title}
                        </div>
                        <div className="text-sm text-gray-400">
                          by {result.shirt.designerName}
                        </div>
                      </>
                    ) : (
                      <div className="text-white font-medium truncate">{result.url}</div>
                    )}

                    {result.error && (
                      <div className="text-sm text-red-400 mt-1">{result.error}</div>
                    )}

                    {result.status === 'skipped' && (
                      <div className="text-sm text-yellow-400 mt-1">
                        Already exists in inventory
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ScraperPage;
