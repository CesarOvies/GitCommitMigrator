import React from 'react';
import { GitBranch, Github, Globe } from 'lucide-react';
import { AppLanguage } from '../types';
import { getTranslation } from '../services/localization';

interface HeaderProps {
  currentLang: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentLang, onLanguageChange }) => {
  const t = getTranslation(currentLang);

  return (
    <header className="border-b border-[#30363D] bg-[#161B22]/90 backdrop-blur sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#238636] flex items-center justify-center text-white shrink-0 shadow-sm">
            <GitBranch className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h1 className="text-base sm:text-lg font-bold text-[#E6EDF3] leading-tight flex items-center gap-2 truncate">
              {t.windowTitle}
              <span className="text-[10px] font-medium bg-[#21262D] text-[#8B949E] px-1.5 py-0.5 rounded border border-[#30363D] hidden sm:inline">
                Web
              </span>
            </h1>
            <p className="text-xs text-[#8B949E] hidden sm:block">Ghost Commits &amp; Activity Graph Preservation</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 bg-[#21262D] border border-[#30363D] rounded-md px-2 py-1">
            <Globe className="w-3.5 h-3.5 text-[#8B949E]" />
            <select
              value={currentLang}
              onChange={(e) => onLanguageChange(e.target.value as AppLanguage)}
              aria-label={t.languageLabel}
              className="bg-transparent text-xs text-[#E6EDF3] focus:outline-none cursor-pointer pr-1"
            >
              <option value="pt-BR" className="bg-[#161B22] text-[#E6EDF3]">PT-BR</option>
              <option value="en-US" className="bg-[#161B22] text-[#E6EDF3]">EN-US</option>
              <option value="es" className="bg-[#161B22] text-[#E6EDF3]">ES</option>
            </select>
          </div>

          {/* GitHub Repo Link */}
          <a
            href="https://github.com/CesarOvies/GitCommitMigrator"
            target="_blank"
            rel="noopener noreferrer"
            title={t.repoLinkText}
            className="flex items-center gap-1.5 text-xs text-[#E6EDF3] bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Github className="w-4 h-4" />
            <span className="hidden md:inline">{t.repoLinkText}</span>
          </a>
        </div>
      </div>
    </header>
  );
};

