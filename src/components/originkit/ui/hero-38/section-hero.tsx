/* eslint-disable */
// @ts-nocheck
"use client"
import React, { useState } from "react";
import { Stethoscope, CalendarCheck, CreditCard, ArrowUpRight } from "lucide-react";
import ParticleSimulation from "@/components/originkit/ui/hero-38/particle-simulation";

export function SectionHero() {
  const [activeCard, setActiveCard] = useState(null);

  return (
    <section className="hero-38 modern-clinics-hero38" id="about">
      {/* Background Ambience & Decorative Watermark */}
      <div className="hero38-ambient-layer" aria-hidden="true" />
      <div className="hero38-ghost-word" aria-hidden="true">
        DOC MATRIX
      </div>

      {/* Interactive WebGL Tree Branch Particle Simulation */}
      <div
        className="hero38-visual-stage"
        role="img"
        aria-label="Interactive moss-covered tree branch particle simulation"
      >
        <ParticleSimulation
          portraitImage="/originkit/hero-38/tree.png"
          background="transparent"
          density={58}
          dotSize={24}
          hover={{ reach: 24, lift: 22, damping: 74 }}
          style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}
        />
      </div>

      <div className="hero38-content-container">
        {/* Main Editorial Headline */}
        <div className="hero38-headline-wrap">
          <h2 className="hero38-heading">
            Healthcare technology, designed to{" "}
            <span className="hero38-gradient-highlight">
              fade into the background
            </span>
            .
          </h2>
        </div>

        {/* 3 Interactive Sideways Cards (In 1 horizontal row) */}
        <div className="hero38-sideways-grid" role="region" aria-label="Core Clinic Capabilities">
          {/* Card 1: Dental Care */}
          <article
            className={`hero38-card ${activeCard === 1 ? "is-hovered" : ""}`}
            onMouseEnter={() => setActiveCard(1)}
            onMouseLeave={() => setActiveCard(null)}
          >
            <div className="hero38-card-top">
              <div className="hero38-card-icon-bubble">
                <Stethoscope size={22} color="#008891" strokeWidth={2.2} />
              </div>
              <span className="hero38-card-pill-meta">Longitudinal</span>
            </div>

            <div className="hero38-card-content">
              <h3 className="hero38-card-title">Complete Dental Care</h3>
              <p className="hero38-card-description">
                Comprehensive <strong className="hero38-keyword">patient records</strong>, interactive tooth charts, structured treatment plans, and{" "}
                <strong className="hero38-keyword">multi-visit tracking</strong>.
              </p>
            </div>

            <div className="hero38-card-footer">
              <span className="hero38-card-action-label">Explore Dental EMR</span>
              <span className="hero38-card-arrow">
                <ArrowUpRight size={15} />
              </span>
            </div>
          </article>

          {/* Card 2: Operations */}
          <article
            className={`hero38-card ${activeCard === 2 ? "is-hovered" : ""}`}
            onMouseEnter={() => setActiveCard(2)}
            onMouseLeave={() => setActiveCard(null)}
          >
            <div className="hero38-card-top">
              <div className="hero38-card-icon-bubble">
                <CalendarCheck size={22} color="#008891" strokeWidth={2.2} />
              </div>
              <span className="hero38-card-pill-meta">Automated</span>
            </div>

            <div className="hero38-card-content">
              <h3 className="hero38-card-title">Effortless Clinic Operations</h3>
              <p className="hero38-card-description">
                <strong className="hero38-keyword">Real-time appointments</strong>, automated WhatsApp reminders, recall notifications, and connected{" "}
                <strong className="hero38-keyword">inventory management</strong>.
              </p>
            </div>

            <div className="hero38-card-footer">
              <span className="hero38-card-action-label">Explore Operations</span>
              <span className="hero38-card-arrow">
                <ArrowUpRight size={15} />
              </span>
            </div>
          </article>

          {/* Card 3: Financials */}
          <article
            className={`hero38-card ${activeCard === 3 ? "is-hovered" : ""}`}
            onMouseEnter={() => setActiveCard(3)}
            onMouseLeave={() => setActiveCard(null)}
          >
            <div className="hero38-card-top">
              <div className="hero38-card-icon-bubble">
                <CreditCard size={22} color="#008891" strokeWidth={2.2} />
              </div>
              <span className="hero38-card-pill-meta">GST & Tally</span>
            </div>

            <div className="hero38-card-content">
              <h3 className="hero38-card-title">Complete Financial Control</h3>
              <p className="hero38-card-description">
                <strong className="hero38-keyword">Itemised billing</strong>, GST reporting, real-time expense tracking, accounts management, and seamless{" "}
                <strong className="hero38-keyword">Tally export</strong>.
              </p>
            </div>

            <div className="hero38-card-footer">
              <span className="hero38-card-action-label">Explore Financials</span>
              <span className="hero38-card-arrow">
                <ArrowUpRight size={15} />
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
export default SectionHero;
