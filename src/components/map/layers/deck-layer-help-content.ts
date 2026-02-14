export function getDeckLayerHelpContent(siteVariant: string): string {
  const techHelpContent = `
      <div class="layer-help-header">
        <span>Map Layers Guide</span>
        <button class="layer-help-close">×</button>
      </div>
      <div class="layer-help-content">
        <div class="layer-help-section">
          <div class="layer-help-title">Tech Ecosystem</div>
          <div class="layer-help-item"><span>STARTUPHUBS</span> Major startup ecosystems (SF, NYC, London, etc.)</div>
          <div class="layer-help-item"><span>CLOUDREGIONS</span> AWS, Azure, GCP data center regions</div>
          <div class="layer-help-item"><span>TECHHQS</span> Headquarters of major tech companies</div>
          <div class="layer-help-item"><span>ACCELERATORS</span> Y Combinator, Techstars, 500 Startups locations</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Infrastructure</div>
          <div class="layer-help-item"><span>CABLES</span> Major undersea fiber optic cables (internet backbone)</div>
          <div class="layer-help-item"><span>DATACENTERS</span> AI compute clusters ≥10,000 GPUs</div>
          <div class="layer-help-item"><span>OUTAGES</span> Internet blackouts and service disruptions</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Natural & Economic</div>
          <div class="layer-help-item"><span>NATURAL</span> Earthquakes, storms, fires (may affect data centers)</div>
          <div class="layer-help-item"><span>WEATHER</span> Severe weather alerts</div>
          <div class="layer-help-item"><span>ECONOMIC</span> Stock exchanges & central banks</div>
          <div class="layer-help-item"><span>COUNTRIES</span> Country name overlays</div>
        </div>
      </div>
    `;

  const fullHelpContent = `
      <div class="layer-help-header">
        <span>Map Layers Guide</span>
        <button class="layer-help-close">×</button>
      </div>
      <div class="layer-help-content">
        <div class="layer-help-section">
          <div class="layer-help-title">Time Filter (top-right)</div>
          <div class="layer-help-item"><span>1H/6H/24H</span> Filter time-based data to recent hours</div>
          <div class="layer-help-item"><span>7D/30D/ALL</span> Show data from past week, month, or all time</div>
          <div class="layer-help-note">Affects: Earthquakes, Weather, Protests, Outages</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Geopolitical</div>
          <div class="layer-help-item"><span>CONFLICTS</span> Active war zones (Ukraine, Gaza, etc.) with boundaries</div>
          <div class="layer-help-item"><span>HOTSPOTS</span> Tension regions - color-coded by news activity level</div>
          <div class="layer-help-item"><span>SANCTIONS</span> Countries under US/EU/UN economic sanctions</div>
          <div class="layer-help-item"><span>PROTESTS</span> Civil unrest, demonstrations (time-filtered)</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Military & Strategic</div>
          <div class="layer-help-item"><span>BASES</span> US/NATO, China, Russia military installations (150+)</div>
          <div class="layer-help-item"><span>NUCLEAR</span> Power plants, enrichment, weapons facilities</div>
          <div class="layer-help-item"><span>IRRADIATORS</span> Industrial gamma irradiator facilities</div>
          <div class="layer-help-item"><span>MILITARY</span> Live military aircraft and vessel tracking</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Infrastructure</div>
          <div class="layer-help-item"><span>CABLES</span> Major undersea fiber optic cables (20 backbone routes)</div>
          <div class="layer-help-item"><span>PIPELINES</span> Oil/gas pipelines (Nord Stream, TAPI, etc.)</div>
          <div class="layer-help-item"><span>OUTAGES</span> Internet blackouts and disruptions</div>
          <div class="layer-help-item"><span>DATACENTERS</span> AI compute clusters ≥10,000 GPUs only</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Transport</div>
          <div class="layer-help-item"><span>SHIPPING</span> Vessels, chokepoints, 61 strategic ports</div>
          <div class="layer-help-item"><span>DELAYS</span> Airport delays and ground stops (FAA)</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Natural & Economic</div>
          <div class="layer-help-item"><span>NATURAL</span> Earthquakes (USGS) + storms, fires, volcanoes, floods (NASA EONET)</div>
          <div class="layer-help-item"><span>WEATHER</span> Severe weather alerts</div>
          <div class="layer-help-item"><span>ECONOMIC</span> Stock exchanges & central banks</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Labels</div>
          <div class="layer-help-item"><span>COUNTRIES</span> Country name overlays</div>
          <div class="layer-help-item"><span>WATERWAYS</span> Strategic chokepoint labels</div>
        </div>
      </div>
    `;

  return siteVariant === 'tech' ? techHelpContent : fullHelpContent;
}
