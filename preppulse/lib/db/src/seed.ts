import { db } from "./index";
import { topicsTable } from "./schema";

type Weightage = "low" | "medium" | "high";

interface CatalogTopic {
  subject: string;
  chapter: string;
  name: string;
  weightage: Weightage;
  prerequisites?: string[];
}

// JEE Main-oriented syllabus catalog. Chapter grouping + prerequisites power
// the Syllabus/Coverage tracker (locked/todo/in-progress/done states).
const JEE_TRACK = "jee_main";
const jeeCatalog: CatalogTopic[] = [
  // Physics
  { subject: "Physics", chapter: "Mechanics", name: "Kinematics", weightage: "high" },
  { subject: "Physics", chapter: "Mechanics", name: "Newton's Laws of Motion", weightage: "high", prerequisites: ["Kinematics"] },
  { subject: "Physics", chapter: "Mechanics", name: "Work, Power & Energy", weightage: "medium", prerequisites: ["Newton's Laws of Motion"] },
  { subject: "Physics", chapter: "Mechanics", name: "Rotational Motion", weightage: "high", prerequisites: ["Newton's Laws of Motion"] },
  { subject: "Physics", chapter: "Mechanics", name: "Gravitation", weightage: "medium", prerequisites: ["Rotational Motion"] },
  { subject: "Physics", chapter: "Thermal Physics", name: "Thermal Properties of Matter", weightage: "low" },
  { subject: "Physics", chapter: "Thermal Physics", name: "Thermodynamics", weightage: "medium", prerequisites: ["Thermal Properties of Matter"] },
  { subject: "Physics", chapter: "Oscillations & Waves", name: "Simple Harmonic Motion", weightage: "medium" },
  { subject: "Physics", chapter: "Oscillations & Waves", name: "Waves", weightage: "medium", prerequisites: ["Simple Harmonic Motion"] },
  { subject: "Physics", chapter: "Electrostatics", name: "Electrostatics", weightage: "high" },
  { subject: "Physics", chapter: "Current Electricity", name: "Current Electricity", weightage: "medium", prerequisites: ["Electrostatics"] },
  { subject: "Physics", chapter: "Magnetism", name: "Magnetism & Magnetic Effects", weightage: "medium", prerequisites: ["Current Electricity"] },
  { subject: "Physics", chapter: "Magnetism", name: "Electromagnetic Induction", weightage: "medium", prerequisites: ["Magnetism & Magnetic Effects"] },
  { subject: "Physics", chapter: "Optics", name: "Ray Optics", weightage: "high", prerequisites: ["Waves"] },
  { subject: "Physics", chapter: "Optics", name: "Wave Optics", weightage: "medium", prerequisites: ["Ray Optics"] },
  { subject: "Physics", chapter: "Modern Physics", name: "Dual Nature of Radiation", weightage: "medium" },
  { subject: "Physics", chapter: "Modern Physics", name: "Atoms & Nuclei", weightage: "low", prerequisites: ["Dual Nature of Radiation"] },

  // Chemistry — Physical
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Mole Concept", weightage: "medium" },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Atomic Structure", weightage: "medium", prerequisites: ["Mole Concept"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Chemical Bonding", weightage: "medium", prerequisites: ["Atomic Structure"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Thermodynamics", weightage: "high", prerequisites: ["Mole Concept"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Equilibrium", weightage: "high", prerequisites: ["Thermodynamics"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Chemical Kinetics", weightage: "high", prerequisites: ["Equilibrium"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Electrochemistry", weightage: "medium", prerequisites: ["Chemical Kinetics"] },

  // Chemistry — Organic
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "General Organic Chemistry", weightage: "high" },
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "Hydrocarbons", weightage: "medium", prerequisites: ["General Organic Chemistry"] },
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "Aldehydes, Ketones & Acids", weightage: "medium", prerequisites: ["Hydrocarbons"] },
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "Amines", weightage: "low", prerequisites: ["Aldehydes, Ketones & Acids"] },
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "Biomolecules", weightage: "low", prerequisites: ["Aldehydes, Ketones & Acids"] },

  // Chemistry — Inorganic
  { subject: "Chemistry", chapter: "Inorganic Chemistry", name: "Periodic Table & Periodicity", weightage: "medium" },
  { subject: "Chemistry", chapter: "Inorganic Chemistry", name: "s-Block Elements", weightage: "low", prerequisites: ["Periodic Table & Periodicity"] },
  { subject: "Chemistry", chapter: "Inorganic Chemistry", name: "p-Block Elements", weightage: "low", prerequisites: ["Periodic Table & Periodicity"] },
  { subject: "Chemistry", chapter: "Inorganic Chemistry", name: "Coordination Compounds", weightage: "medium", prerequisites: ["Chemical Bonding"] },

  // Mathematics — Algebra
  { subject: "Mathematics", chapter: "Algebra", name: "Functions", weightage: "medium" },
  { subject: "Mathematics", chapter: "Algebra", name: "Quadratic Equations", weightage: "medium", prerequisites: ["Functions"] },
  { subject: "Mathematics", chapter: "Algebra", name: "Complex Numbers", weightage: "high", prerequisites: ["Quadratic Equations"] },
  { subject: "Mathematics", chapter: "Algebra", name: "Sequences & Series", weightage: "medium" },
  { subject: "Mathematics", chapter: "Algebra", name: "Permutations & Combinations", weightage: "medium" },
  { subject: "Mathematics", chapter: "Algebra", name: "Binomial Theorem", weightage: "low", prerequisites: ["Permutations & Combinations"] },

  // Mathematics — Calculus
  { subject: "Mathematics", chapter: "Calculus", name: "Limits & Continuity", weightage: "high" },
  { subject: "Mathematics", chapter: "Calculus", name: "Differentiation", weightage: "high", prerequisites: ["Limits & Continuity"] },
  { subject: "Mathematics", chapter: "Calculus", name: "Applications of Derivatives", weightage: "medium", prerequisites: ["Differentiation"] },
  { subject: "Mathematics", chapter: "Calculus", name: "Indefinite Integrals", weightage: "medium", prerequisites: ["Differentiation"] },
  { subject: "Mathematics", chapter: "Calculus", name: "Definite Integrals", weightage: "high", prerequisites: ["Indefinite Integrals"] },
  { subject: "Mathematics", chapter: "Calculus", name: "Differential Equations", weightage: "medium", prerequisites: ["Definite Integrals"] },

  // Mathematics — Geometry
  { subject: "Mathematics", chapter: "Geometry", name: "Vectors & 3D Geometry", weightage: "high" },
  { subject: "Mathematics", chapter: "Geometry", name: "Straight Lines", weightage: "low", prerequisites: ["Vectors & 3D Geometry"] },
  { subject: "Mathematics", chapter: "Geometry", name: "Circles", weightage: "low", prerequisites: ["Straight Lines"] },
  { subject: "Mathematics", chapter: "Geometry", name: "Conic Sections", weightage: "high", prerequisites: ["Circles"] },
];

// Official NMC/NTA NEET (UG) 2026 syllabus: 20 Physics units, 20 Chemistry
// units (Physical/Inorganic/Organic) and 10 Biology units, chapters named by
// the official unit, topics transcribed from the official syllabus text.
// Weightage reflects the historical importance of each unit in NEET (the
// official syllabus publishes no per-topic weightage). Prerequisites are
// strictly minimal and only where the topic structure genuinely builds on an
// earlier topic (same subject).
const NEET_TRACK = "neet";
const neetCatalog: CatalogTopic[] = [
  // ── Physics (Units 1-20) ────────────────────────────────────────────────
  { subject: "Physics", chapter: "Physics and Measurement", name: "Units of measurements, System of Units, SI Units, fundamental and derived units", weightage: "high" },
  { subject: "Physics", chapter: "Physics and Measurement", name: "Least count, significant figures and errors in measurements", weightage: "high" },
  { subject: "Physics", chapter: "Physics and Measurement", name: "Dimensions of Physics quantities, dimensional analysis and its applications", weightage: "high" },

  { subject: "Physics", chapter: "Kinematics", name: "Frame of reference, motion in a straight line, position-time graph", weightage: "high" },
  { subject: "Physics", chapter: "Kinematics", name: "Speed and velocity, uniform and non-uniform motion", weightage: "high" },
  { subject: "Physics", chapter: "Kinematics", name: "Uniformly accelerated motion, velocity-time and position-time relations", weightage: "high" },
  { subject: "Physics", chapter: "Kinematics", name: "Scalars and vectors, addition and subtraction, unit vector, resolution of a vector", weightage: "high" },
  { subject: "Physics", chapter: "Kinematics", name: "Relative velocity and motion in a plane", weightage: "high" },
  { subject: "Physics", chapter: "Kinematics", name: "Projectile motion and uniform circular motion", weightage: "medium" },

  { subject: "Physics", chapter: "Laws of Motion", name: "Newton's laws of motion, force, inertia, momentum and impulse", weightage: "high" },
  { subject: "Physics", chapter: "Laws of Motion", name: "Law of conservation of linear momentum and its applications", weightage: "high" },
  { subject: "Physics", chapter: "Laws of Motion", name: "Equilibrium of concurrent forces", weightage: "medium" },
  { subject: "Physics", chapter: "Laws of Motion", name: "Static and kinetic friction, laws of friction, rolling friction", weightage: "high" },
  { subject: "Physics", chapter: "Laws of Motion", name: "Dynamics of uniform circular motion: centripetal force and its applications", weightage: "medium" },

  { subject: "Physics", chapter: "Work, Energy and Power", name: "Work done by constant and variable forces", weightage: "high" },
  { subject: "Physics", chapter: "Work, Energy and Power", name: "Kinetic and potential energies, work-energy theorem, power", weightage: "high", prerequisites: ["Newton's laws of motion, force, inertia, momentum and impulse"] },
  { subject: "Physics", chapter: "Work, Energy and Power", name: "Potential energy of a spring, conservation of mechanical energy", weightage: "high" },
  { subject: "Physics", chapter: "Work, Energy and Power", name: "Conservative and non-conservative forces, motion in a vertical circle", weightage: "medium" },
  { subject: "Physics", chapter: "Work, Energy and Power", name: "Elastic and inelastic collisions in one and two dimensions", weightage: "medium", prerequisites: ["Law of conservation of linear momentum and its applications"] },

  { subject: "Physics", chapter: "Rotational Motion", name: "Centre of mass of a two-particle system and of a rigid body", weightage: "high" },
  { subject: "Physics", chapter: "Rotational Motion", name: "Moment of a force, torque, angular momentum and its conservation", weightage: "high", prerequisites: ["Newton's laws of motion, force, inertia, momentum and impulse"] },
  { subject: "Physics", chapter: "Rotational Motion", name: "Moment of inertia, radius of gyration, parallel and perpendicular axes theorems", weightage: "high" },
  { subject: "Physics", chapter: "Rotational Motion", name: "Equilibrium of rigid bodies, rigid body rotation and equations of rotational motion", weightage: "medium" },

  { subject: "Physics", chapter: "Gravitation", name: "Universal law of gravitation", weightage: "high" },
  { subject: "Physics", chapter: "Gravitation", name: "Acceleration due to gravity and its variation with altitude and depth", weightage: "high" },
  { subject: "Physics", chapter: "Gravitation", name: "Kepler's laws of planetary motion", weightage: "medium" },
  { subject: "Physics", chapter: "Gravitation", name: "Gravitational potential energy and gravitational potential", weightage: "medium" },
  { subject: "Physics", chapter: "Gravitation", name: "Escape velocity, motion of a satellite, orbital velocity, time period and energy of satellite", weightage: "high" },

  { subject: "Physics", chapter: "Properties of Solids and Liquids", name: "Elastic behaviour, stress-strain relationship, Hooke's law, Young's modulus, bulk modulus, modulus of rigidity", weightage: "medium" },
  { subject: "Physics", chapter: "Properties of Solids and Liquids", name: "Pressure due to a fluid column, Pascal's law and its applications", weightage: "high" },
  { subject: "Physics", chapter: "Properties of Solids and Liquids", name: "Viscosity, Stokes' law, terminal velocity, streamline and turbulent flow, critical velocity", weightage: "high" },
  { subject: "Physics", chapter: "Properties of Solids and Liquids", name: "Bernoulli's principle and its applications", weightage: "high" },
  { subject: "Physics", chapter: "Properties of Solids and Liquids", name: "Surface energy and surface tension, angle of contact, excess of pressure across a curved surface", weightage: "high" },
  { subject: "Physics", chapter: "Properties of Solids and Liquids", name: "Application of surface tension: drops, bubbles and capillary rise", weightage: "medium" },
  { subject: "Physics", chapter: "Properties of Solids and Liquids", name: "Heat, temperature, thermal expansion, specific heat capacity, calorimetry, latent heat", weightage: "high" },
  { subject: "Physics", chapter: "Properties of Solids and Liquids", name: "Heat transfer: conduction, convection and radiation", weightage: "medium" },

  { subject: "Physics", chapter: "Thermodynamics", name: "Thermal equilibrium, zeroth law of thermodynamics, concept of temperature", weightage: "medium" },
  { subject: "Physics", chapter: "Thermodynamics", name: "First law of thermodynamics: heat, work and internal energy, isothermal and adiabatic processes", weightage: "high" },
  { subject: "Physics", chapter: "Thermodynamics", name: "Second law of thermodynamics, reversible and irreversible processes", weightage: "medium" },

  { subject: "Physics", chapter: "Kinetic Theory of Gases", name: "Equation of state of a perfect gas, work done in compressing a gas", weightage: "medium" },
  { subject: "Physics", chapter: "Kinetic Theory of Gases", name: "Kinetic theory of gases: assumptions, concept of pressure, kinetic interpretation of temperature, RMS speed", weightage: "high" },
  { subject: "Physics", chapter: "Kinetic Theory of Gases", name: "Degrees of freedom, law of equipartition of energy and its applications", weightage: "medium" },
  { subject: "Physics", chapter: "Kinetic Theory of Gases", name: "Mean free path and Avogadro's number", weightage: "low" },

  { subject: "Physics", chapter: "Oscillations and Waves", name: "Oscillations and periodic motion: time period, frequency, displacement as a function of time", weightage: "high" },
  { subject: "Physics", chapter: "Oscillations and Waves", name: "Simple harmonic motion and its equation, phase, oscillations of a spring", weightage: "high" },
  { subject: "Physics", chapter: "Oscillations and Waves", name: "Energy in SHM: kinetic and potential energies, simple pendulum and its time period", weightage: "high" },
  { subject: "Physics", chapter: "Oscillations and Waves", name: "Wave motion, longitudinal and transverse waves, speed of travelling wave", weightage: "high" },
  { subject: "Physics", chapter: "Oscillations and Waves", name: "Displacement relation for a progressive wave, superposition and reflection of waves", weightage: "medium" },
  { subject: "Physics", chapter: "Oscillations and Waves", name: "Standing waves in strings and organ pipes, fundamental mode and harmonics, beats", weightage: "medium" },

  { subject: "Physics", chapter: "Electrostatics", name: "Electric charges, conservation of charge, Coulomb's law", weightage: "high" },
  { subject: "Physics", chapter: "Electrostatics", name: "Superposition principle and continuous charge distribution", weightage: "medium" },
  { subject: "Physics", chapter: "Electrostatics", name: "Electric field, field lines, electric dipole, torque on a dipole in a uniform electric field", weightage: "high" },
  { subject: "Physics", chapter: "Electrostatics", name: "Electric flux, Gauss's law and its applications", weightage: "high" },
  { subject: "Physics", chapter: "Electrostatics", name: "Electric potential, potential difference, equipotential surfaces, electrical potential energy", weightage: "high" },
  { subject: "Physics", chapter: "Electrostatics", name: "Conductors and insulators, dielectrics and electric polarisation", weightage: "medium" },
  { subject: "Physics", chapter: "Electrostatics", name: "Capacitors and capacitance, combination of capacitors, energy stored in a capacitor", weightage: "high" },

  { subject: "Physics", chapter: "Current Electricity", name: "Electric current, drift velocity, mobility, Ohm's law, V-I characteristics", weightage: "high" },
  { subject: "Physics", chapter: "Current Electricity", name: "Electrical energy and power, resistivity and conductivity, series and parallel combinations, temperature dependence of resistance", weightage: "high" },
  { subject: "Physics", chapter: "Current Electricity", name: "Internal resistance, potential difference and emf of a cell, combination of cells", weightage: "medium" },
  { subject: "Physics", chapter: "Current Electricity", name: "Kirchhoff's laws and their applications, Wheatstone bridge, metre bridge", weightage: "high" },

  { subject: "Physics", chapter: "Magnetic Effects of Current and Magnetism", name: "Biot-Savart law and its application to a current carrying circular loop", weightage: "high" },
  { subject: "Physics", chapter: "Magnetic Effects of Current and Magnetism", name: "Ampere's law and its applications to a long straight wire and solenoid", weightage: "high" },
  { subject: "Physics", chapter: "Magnetic Effects of Current and Magnetism", name: "Force on a moving charge in uniform magnetic and electric fields", weightage: "high" },
  { subject: "Physics", chapter: "Magnetic Effects of Current and Magnetism", name: "Force on a current-carrying conductor, force between parallel currents, definition of ampere", weightage: "medium" },
  { subject: "Physics", chapter: "Magnetic Effects of Current and Magnetism", name: "Torque on a current loop, moving coil galvanometer, conversion to ammeter and voltmeter", weightage: "high" },
  { subject: "Physics", chapter: "Magnetic Effects of Current and Magnetism", name: "Current loop as a magnetic dipole, bar magnet as an equivalent solenoid", weightage: "medium" },
  { subject: "Physics", chapter: "Magnetic Effects of Current and Magnetism", name: "Magnetic field due to a magnetic dipole, torque on a dipole, para-, dia- and ferromagnetic substances", weightage: "medium" },

  { subject: "Physics", chapter: "Electromagnetic Induction and Alternating Currents", name: "Electromagnetic induction, Faraday's law, induced emf and current, Lenz's law", weightage: "high" },
  { subject: "Physics", chapter: "Electromagnetic Induction and Alternating Currents", name: "Eddy currents, self and mutual inductance", weightage: "medium" },
  { subject: "Physics", chapter: "Electromagnetic Induction and Alternating Currents", name: "Alternating currents: peak and RMS values, reactance and impedance", weightage: "high" },
  { subject: "Physics", chapter: "Electromagnetic Induction and Alternating Currents", name: "LCR series circuit and resonance", weightage: "high" },
  { subject: "Physics", chapter: "Electromagnetic Induction and Alternating Currents", name: "Power in AC circuits, wattless current, AC generator and transformer", weightage: "medium" },

  { subject: "Physics", chapter: "Electromagnetic Waves", name: "Displacement current, electromagnetic waves and their characteristics, transverse nature", weightage: "high" },
  { subject: "Physics", chapter: "Electromagnetic Waves", name: "Electromagnetic spectrum and applications of electromagnetic waves", weightage: "medium" },

  { subject: "Physics", chapter: "Optics", name: "Reflection of light, spherical mirrors, mirror formula", weightage: "high" },
  { subject: "Physics", chapter: "Optics", name: "Refraction of light at plane and spherical surfaces, thin lens formula, lens maker formula", weightage: "high" },
  { subject: "Physics", chapter: "Optics", name: "Total internal reflection and its applications", weightage: "medium" },
  { subject: "Physics", chapter: "Optics", name: "Magnification, power of a lens, combination of thin lenses, refraction through a prism", weightage: "medium" },
  { subject: "Physics", chapter: "Optics", name: "Microscope and astronomical telescope (reflecting and refracting) and their magnifying powers", weightage: "medium" },
  { subject: "Physics", chapter: "Optics", name: "Wavefront and Huygens' principle, laws of reflection and refraction using Huygens' principle", weightage: "high" },
  { subject: "Physics", chapter: "Optics", name: "Interference, Young's double-slit experiment and fringe width, coherent sources", weightage: "high" },
  { subject: "Physics", chapter: "Optics", name: "Diffraction due to a single slit, width of central maximum", weightage: "medium" },
  { subject: "Physics", chapter: "Optics", name: "Polarisation, plane-polarised light, Brewster's law, uses of plane-polarised light and Polaroid", weightage: "medium" },

  { subject: "Physics", chapter: "Dual Nature of Matter and Radiation", name: "Dual nature of radiation, photoelectric effect, Hertz and Lenard's observations", weightage: "high" },
  { subject: "Physics", chapter: "Dual Nature of Matter and Radiation", name: "Einstein's photoelectric equation: particle nature of light", weightage: "high" },
  { subject: "Physics", chapter: "Dual Nature of Matter and Radiation", name: "Matter waves: wave nature of particles, de Broglie relation", weightage: "medium" },

  { subject: "Physics", chapter: "Atoms and Nuclei", name: "Alpha-particle scattering experiment, Rutherford's model of the atom", weightage: "high" },
  { subject: "Physics", chapter: "Atoms and Nuclei", name: "Bohr model, energy levels, hydrogen spectrum", weightage: "high" },
  { subject: "Physics", chapter: "Atoms and Nuclei", name: "Composition and size of nucleus, atomic masses, mass-energy relation, mass defect", weightage: "medium" },
  { subject: "Physics", chapter: "Atoms and Nuclei", name: "Binding energy per nucleon and its variation with mass number, nuclear fission and fusion", weightage: "medium" },

  { subject: "Physics", chapter: "Electronic Devices", name: "Semiconductors, semiconductor diode: I-V characteristics in forward and reverse bias", weightage: "high" },
  { subject: "Physics", chapter: "Electronic Devices", name: "Diode as a rectifier", weightage: "medium" },
  { subject: "Physics", chapter: "Electronic Devices", name: "I-V characteristics of LED, photodiode, solar cell and Zener diode, Zener as a voltage regulator", weightage: "medium" },
  { subject: "Physics", chapter: "Electronic Devices", name: "Logic gates: OR, AND, NOT, NAND and NOR", weightage: "medium" },

  { subject: "Physics", chapter: "Experimental Skills", name: "Vernier callipers: internal and external diameter and depth of a vessel", weightage: "low" },
  { subject: "Physics", chapter: "Experimental Skills", name: "Screw gauge: thickness and diameter of a thin sheet or wire", weightage: "low" },
  { subject: "Physics", chapter: "Experimental Skills", name: "Simple pendulum: energy dissipation, metre scale and the principle of moments", weightage: "low" },
  { subject: "Physics", chapter: "Experimental Skills", name: "Young's modulus of a metallic wire, surface tension by capillary rise", weightage: "low" },
  { subject: "Physics", chapter: "Experimental Skills", name: "Coefficient of viscosity by terminal velocity, speed of sound using a resonance tube", weightage: "low" },
  { subject: "Physics", chapter: "Experimental Skills", name: "Specific heat capacity by method of mixtures, resistivity using a metre bridge, resistance using Ohm's law", weightage: "low" },
  { subject: "Physics", chapter: "Experimental Skills", name: "Galvanometer resistance and figure of merit by half deflection method", weightage: "low" },
  { subject: "Physics", chapter: "Experimental Skills", name: "Focal length of convex mirror, concave mirror and convex lens by parallax method", weightage: "low" },
  { subject: "Physics", chapter: "Experimental Skills", name: "Angle of deviation vs angle of incidence for a prism, refractive index of a glass slab", weightage: "low" },
  { subject: "Physics", chapter: "Experimental Skills", name: "Characteristic curves of a p-n junction diode and Zener diode, identification of components", weightage: "low" },

  // ── Chemistry — Physical (Units 1-8) ────────────────────────────────────
  { subject: "Chemistry", chapter: "Some Basic Concepts in Chemistry", name: "Matter and its nature, Dalton's atomic theory, concept of atom, molecule, element and compound", weightage: "high" },
  { subject: "Chemistry", chapter: "Some Basic Concepts in Chemistry", name: "Laws of chemical combination", weightage: "medium" },
  { subject: "Chemistry", chapter: "Some Basic Concepts in Chemistry", name: "Atomic and molecular masses, mole concept, molar mass, percentage composition", weightage: "high" },
  { subject: "Chemistry", chapter: "Some Basic Concepts in Chemistry", name: "Empirical and molecular formulae", weightage: "high" },
  { subject: "Chemistry", chapter: "Some Basic Concepts in Chemistry", name: "Chemical equations and stoichiometry", weightage: "high" },

  { subject: "Chemistry", chapter: "Atomic Structure", name: "Nature of electromagnetic radiation, photoelectric effect, spectrum of the hydrogen atom", weightage: "high" },
  { subject: "Chemistry", chapter: "Atomic Structure", name: "Bohr model of the hydrogen atom: postulates, energy and radii relations, limitations", weightage: "high" },
  { subject: "Chemistry", chapter: "Atomic Structure", name: "Dual nature of matter, de Broglie's relationship, Heisenberg uncertainty principle", weightage: "medium" },
  { subject: "Chemistry", chapter: "Atomic Structure", name: "Quantum mechanical model of the atom, quantum numbers, shapes of s, p and d orbitals", weightage: "high" },
  { subject: "Chemistry", chapter: "Atomic Structure", name: "Rules for filling electrons: Aufbau principle, Pauli's exclusion principle, Hund's rule, electronic configuration", weightage: "high" },

  { subject: "Chemistry", chapter: "Chemical Bonding and Molecular Structure", name: "Kossel-Lewis approach, concept of ionic and covalent bonds, ionic bond formation, lattice enthalpy", weightage: "high" },
  { subject: "Chemistry", chapter: "Chemical Bonding and Molecular Structure", name: "Electronegativity, Fajan's rule, dipole moment, VSEPR theory and shapes of simple molecules", weightage: "high" },
  { subject: "Chemistry", chapter: "Chemical Bonding and Molecular Structure", name: "Valence bond theory, hybridisation involving s, p and d orbitals, resonance", weightage: "high" },
  { subject: "Chemistry", chapter: "Chemical Bonding and Molecular Structure", name: "Molecular orbital theory, LCAO, sigma and pi bonds, bond order, bond length and bond energy", weightage: "medium" },
  { subject: "Chemistry", chapter: "Chemical Bonding and Molecular Structure", name: "Metallic bonding and hydrogen bonding", weightage: "medium" },

  { subject: "Chemistry", chapter: "Chemical Thermodynamics", name: "Fundamentals of thermodynamics: system and surroundings, extensive and intensive properties, state functions, types of processes", weightage: "medium" },
  { subject: "Chemistry", chapter: "Chemical Thermodynamics", name: "First law of thermodynamics: work, heat, internal energy, enthalpy, heat capacity", weightage: "high" },
  { subject: "Chemistry", chapter: "Chemical Thermodynamics", name: "Hess's law of constant heat summation and enthalpies of various processes", weightage: "high" },
  { subject: "Chemistry", chapter: "Chemical Thermodynamics", name: "Second law of thermodynamics, spontaneity of processes and equilibrium constant", weightage: "medium" },

  { subject: "Chemistry", chapter: "Solutions", name: "Methods for expressing concentration: molality, molarity, mole fraction, percentage", weightage: "high" },
  { subject: "Chemistry", chapter: "Solutions", name: "Vapour pressure of solutions and Raoult's law, ideal and non-ideal solutions", weightage: "high" },
  { subject: "Chemistry", chapter: "Solutions", name: "Colligative properties: relative lowering of vapour pressure, depression of freezing point, elevation of boiling point, osmotic pressure", weightage: "high" },
  { subject: "Chemistry", chapter: "Solutions", name: "Determination of molecular mass using colligative properties, abnormal molar mass, van't Hoff factor", weightage: "high" },

  { subject: "Chemistry", chapter: "Equilibrium", name: "Meaning of equilibrium, dynamic equilibrium, equilibria involving physical processes, Henry's law", weightage: "medium" },
  { subject: "Chemistry", chapter: "Equilibrium", name: "Law of chemical equilibrium, equilibrium constants (Kp and Kc), factors affecting equilibrium, Le Chatelier's principle", weightage: "high" },
  { subject: "Chemistry", chapter: "Equilibrium", name: "Ionic equilibrium: electrolytes, concepts of acids and bases, ionization constants, pH scale", weightage: "high" },
  { subject: "Chemistry", chapter: "Equilibrium", name: "Common ion effect, hydrolysis of salts, solubility and solubility product, buffer solutions", weightage: "high" },

  { subject: "Chemistry", chapter: "Redox Reactions and Electrochemistry", name: "Electronic concepts of oxidation and reduction, oxidation number, balancing of redox reactions", weightage: "high" },
  { subject: "Chemistry", chapter: "Redox Reactions and Electrochemistry", name: "Conductance in electrolytic solutions, molar conductivities and their variation with concentration, Kohlrausch's law", weightage: "medium" },
  { subject: "Chemistry", chapter: "Redox Reactions and Electrochemistry", name: "Electrolytic and Galvanic cells, electrode potentials, emf of a galvanic cell", weightage: "high" },
  { subject: "Chemistry", chapter: "Redox Reactions and Electrochemistry", name: "Nernst equation, relationship between cell potential and Gibbs' energy change", weightage: "high" },
  { subject: "Chemistry", chapter: "Redox Reactions and Electrochemistry", name: "Dry cell and lead accumulator, fuel cells", weightage: "medium" },

  { subject: "Chemistry", chapter: "Chemical Kinetics", name: "Rate of a chemical reaction, factors affecting rate, order and molecularity of reactions", weightage: "high" },
  { subject: "Chemistry", chapter: "Chemical Kinetics", name: "Rate law, rate constant, differential and integral forms of zero and first order reactions, half-lives", weightage: "high" },
  { subject: "Chemistry", chapter: "Chemical Kinetics", name: "Arrhenius theory, activation energy, collision theory", weightage: "high" },

  // ── Chemistry — Inorganic (Units 9-12) ──────────────────────────────────
  { subject: "Chemistry", chapter: "Classification of Elements and Periodicity in Properties", name: "Modern periodic law and present form of the periodic table, s, p, d and f block elements", weightage: "medium" },
  { subject: "Chemistry", chapter: "Classification of Elements and Periodicity in Properties", name: "Periodic trends in properties: atomic and ionic radii, ionization enthalpy, electron gain enthalpy", weightage: "high" },
  { subject: "Chemistry", chapter: "Classification of Elements and Periodicity in Properties", name: "Valence, oxidation states and chemical reactivity", weightage: "medium" },

  { subject: "Chemistry", chapter: "P-Block Elements", name: "Group 13 to Group 18 elements: electronic configuration and general trends in properties", weightage: "medium" },
  { subject: "Chemistry", chapter: "P-Block Elements", name: "Unique behaviour of the first element in each group", weightage: "medium" },

  { subject: "Chemistry", chapter: "d- and f-Block Elements", name: "Transition elements: general introduction, electronic configuration, occurrence and characteristics", weightage: "medium" },
  { subject: "Chemistry", chapter: "d- and f-Block Elements", name: "Trends in properties of first-row transition elements", weightage: "high" },
  { subject: "Chemistry", chapter: "d- and f-Block Elements", name: "Preparation, properties and uses of K2Cr2O7 and KMnO4", weightage: "medium" },
  { subject: "Chemistry", chapter: "d- and f-Block Elements", name: "Lanthanoids: electronic configuration, oxidation states, lanthanoid contraction", weightage: "medium" },
  { subject: "Chemistry", chapter: "d- and f-Block Elements", name: "Actinoids: electronic configuration and oxidation states", weightage: "low" },

  { subject: "Chemistry", chapter: "Co-Ordination Compounds", name: "Introduction to coordination compounds, Werner's theory, ligands, coordination number, denticity, chelation", weightage: "high" },
  { subject: "Chemistry", chapter: "Co-Ordination Compounds", name: "IUPAC nomenclature of mononuclear coordination compounds, isomerism", weightage: "high" },
  { subject: "Chemistry", chapter: "Co-Ordination Compounds", name: "Bonding: valence bond approach and basic ideas of crystal field theory, colour and magnetic properties", weightage: "high" },
  { subject: "Chemistry", chapter: "Co-Ordination Compounds", name: "Importance of coordination compounds in qualitative analysis, extraction of metals and biological systems", weightage: "medium" },

  // ── Chemistry — Organic (Units 13-20) ───────────────────────────────────
  { subject: "Chemistry", chapter: "Purification and Characterisation of Organic Compounds", name: "Purification: crystallisation, sublimation, distillation, differential extraction, chromatography", weightage: "medium" },
  { subject: "Chemistry", chapter: "Purification and Characterisation of Organic Compounds", name: "Qualitative analysis: detection of nitrogen, sulphur, phosphorus and halogens", weightage: "medium" },
  { subject: "Chemistry", chapter: "Purification and Characterisation of Organic Compounds", name: "Quantitative analysis: estimation of elements, empirical and molecular formulae", weightage: "medium" },

  { subject: "Chemistry", chapter: "Some Basic Principles of Organic Chemistry", name: "Tetravalency of carbon, shapes of simple molecules, hybridisation (s and p)", weightage: "high" },
  { subject: "Chemistry", chapter: "Some Basic Principles of Organic Chemistry", name: "Classification of organic compounds, homologous series, isomerism (structural and stereoisomerism)", weightage: "high" },
  { subject: "Chemistry", chapter: "Some Basic Principles of Organic Chemistry", name: "Nomenclature: trivial and IUPAC", weightage: "high" },
  { subject: "Chemistry", chapter: "Some Basic Principles of Organic Chemistry", name: "Covalent bond fission: homolytic and heterolytic, free radicals, carbocations, carbanions, electrophiles and nucleophiles", weightage: "high" },
  { subject: "Chemistry", chapter: "Some Basic Principles of Organic Chemistry", name: "Electronic displacement in a covalent bond: inductive effect, electromeric effect, resonance, hyperconjugation", weightage: "high" },
  { subject: "Chemistry", chapter: "Some Basic Principles of Organic Chemistry", name: "Common types of organic reactions: substitution, addition, elimination and rearrangement", weightage: "medium" },

  { subject: "Chemistry", chapter: "Hydrocarbons", name: "Alkanes: classification, isomerism, nomenclature, preparation, properties, conformations, mechanism of halogenation", weightage: "high", prerequisites: ["Electronic displacement in a covalent bond: inductive effect, electromeric effect, resonance, hyperconjugation"] },
  { subject: "Chemistry", chapter: "Hydrocarbons", name: "Alkenes: geometrical isomerism, mechanism of electrophilic addition, ozonolysis, polymerisation", weightage: "high", prerequisites: ["Alkanes: classification, isomerism, nomenclature, preparation, properties, conformations, mechanism of halogenation"] },
  { subject: "Chemistry", chapter: "Hydrocarbons", name: "Alkynes: acidic character, addition reactions", weightage: "medium" },
  { subject: "Chemistry", chapter: "Hydrocarbons", name: "Aromatic hydrocarbons: benzene, structure and aromaticity, electrophilic substitution, Friedel-Crafts reactions, directive influence", weightage: "high" },

  { subject: "Chemistry", chapter: "Organic Compounds Containing Halogens", name: "General methods of preparation, properties, reactions, nature of C-X bond, mechanisms of substitution reactions", weightage: "medium" },
  { subject: "Chemistry", chapter: "Organic Compounds Containing Halogens", name: "Uses and environmental effects of chloroform, iodoform, freons and DDT", weightage: "low" },

  { subject: "Chemistry", chapter: "Organic Compounds Containing Oxygen", name: "Alcohols: identification of primary, secondary and tertiary alcohols, mechanism of dehydration", weightage: "high" },
  { subject: "Chemistry", chapter: "Organic Compounds Containing Oxygen", name: "Phenols: acidic nature, electrophilic substitution reactions, Reimer-Tiemann reaction", weightage: "medium" },
  { subject: "Chemistry", chapter: "Organic Compounds Containing Oxygen", name: "Ethers: structure, preparation and properties", weightage: "medium" },
  { subject: "Chemistry", chapter: "Organic Compounds Containing Oxygen", name: "Aldehydes and ketones: nature of carbonyl group, nucleophilic addition, oxidation and reduction, aldol condensation, Cannizzaro reaction", weightage: "high" },
  { subject: "Chemistry", chapter: "Organic Compounds Containing Oxygen", name: "Carboxylic acids: acidic strength and factors affecting it", weightage: "medium" },

  { subject: "Chemistry", chapter: "Organic Compounds Containing Nitrogen", name: "Amines: nomenclature, classification, structure, basic character, identification of primary, secondary and tertiary amines", weightage: "high" },
  { subject: "Chemistry", chapter: "Organic Compounds Containing Nitrogen", name: "Diazonium salts: importance in synthetic organic chemistry", weightage: "medium" },

  { subject: "Chemistry", chapter: "Biomolecules", name: "Carbohydrates: classification, aldoses and ketoses, monosaccharides, oligosaccharides", weightage: "high" },
  { subject: "Chemistry", chapter: "Biomolecules", name: "Proteins: amino acids, peptide bond, polypeptides, structure, denaturation, enzymes", weightage: "high" },
  { subject: "Chemistry", chapter: "Biomolecules", name: "Vitamins: classification and functions", weightage: "medium" },
  { subject: "Chemistry", chapter: "Biomolecules", name: "Nucleic acids: chemical constitution of DNA and RNA, biological functions", weightage: "medium" },
  { subject: "Chemistry", chapter: "Biomolecules", name: "Hormones: general introduction", weightage: "low" },

  { subject: "Chemistry", chapter: "Principles Related to Practical Chemistry", name: "Detection of extra elements (nitrogen, sulphur, halogens) and functional groups in organic compounds", weightage: "medium" },
  { subject: "Chemistry", chapter: "Principles Related to Practical Chemistry", name: "Preparation of inorganic compounds: Mohr's salt, potash alum", weightage: "medium" },
  { subject: "Chemistry", chapter: "Principles Related to Practical Chemistry", name: "Preparation of organic compounds: acetanilide, p-nitroacetanilide, aniline yellow, iodoform", weightage: "medium" },
  { subject: "Chemistry", chapter: "Principles Related to Practical Chemistry", name: "Titrimetric exercises: acids, bases and indicators, oxalic acid vs KMnO4, Mohr's salt vs KMnO4", weightage: "medium" },
  { subject: "Chemistry", chapter: "Principles Related to Practical Chemistry", name: "Qualitative salt analysis: cations and anions", weightage: "medium" },
  { subject: "Chemistry", chapter: "Principles Related to Practical Chemistry", name: "Chemical principles in experiments: enthalpy of solution and neutralisation, colloids, kinetics of iodide ions with hydrogen peroxide", weightage: "low" },

  // ── Biology (Units 1-10) ─────────────────────────────────────────────────
  { subject: "Biology", chapter: "Diversity in Living World", name: "What is living? Biodiversity, need for classification, taxonomy and systematics", weightage: "medium" },
  { subject: "Biology", chapter: "Diversity in Living World", name: "Concept of species and taxonomical hierarchy, binomial nomenclature", weightage: "high" },
  { subject: "Biology", chapter: "Diversity in Living World", name: "Five kingdom classification: Monera, Protista and Fungi, lichens, viruses and viroids", weightage: "high" },
  { subject: "Biology", chapter: "Diversity in Living World", name: "Salient features and classification of plants: algae, bryophytes, pteridophytes, gymnosperms", weightage: "medium" },
  { subject: "Biology", chapter: "Diversity in Living World", name: "Salient features and classification of animals: nonchordates and chordates", weightage: "medium" },

  { subject: "Biology", chapter: "Structural Organisation in Animals and Plants", name: "Morphology and modifications, tissues, anatomy and functions of parts of flowering plants", weightage: "medium" },
  { subject: "Biology", chapter: "Structural Organisation in Animals and Plants", name: "Families: Malvaceae, Cruciferae, Leguminosae, Compositae, Graminae", weightage: "low" },
  { subject: "Biology", chapter: "Structural Organisation in Animals and Plants", name: "Animal tissues", weightage: "medium" },
  { subject: "Biology", chapter: "Structural Organisation in Animals and Plants", name: "Morphology, anatomy and functions of different systems of a frog (brief account)", weightage: "medium" },

  { subject: "Biology", chapter: "Cell Structure and Function", name: "Cell theory, structure of prokaryotic and eukaryotic cells, plant and animal cells", weightage: "high" },
  { subject: "Biology", chapter: "Cell Structure and Function", name: "Cell envelope, cell membrane, cell wall", weightage: "high" },
  { subject: "Biology", chapter: "Cell Structure and Function", name: "Cell organelles: endomembrane system, mitochondria, ribosomes, plastids, microbodies", weightage: "high" },
  { subject: "Biology", chapter: "Cell Structure and Function", name: "Cytoskeleton, cilia, flagella, centrioles; nucleus: nuclear membrane, chromatin, nucleolus", weightage: "medium" },
  { subject: "Biology", chapter: "Cell Structure and Function", name: "Biomolecules: structure and function of proteins, carbohydrates, lipids, nucleic acids", weightage: "high" },
  { subject: "Biology", chapter: "Cell Structure and Function", name: "Enzymes: types, properties, enzyme action, classification and nomenclature", weightage: "medium" },
  { subject: "Biology", chapter: "Cell Structure and Function", name: "Cell division: cell cycle, mitosis, meiosis and their significance", weightage: "high" },

  { subject: "Biology", chapter: "Plant Physiology", name: "Photosynthesis: autotrophic nutrition, site and pigments, photochemical and biosynthetic phases", weightage: "high" },
  { subject: "Biology", chapter: "Plant Physiology", name: "Cyclic and non-cyclic photophosphorylation, chemiosmotic hypothesis, photorespiration, C3 and C4 pathways", weightage: "high" },
  { subject: "Biology", chapter: "Plant Physiology", name: "Respiration: glycolysis, fermentation, TCA cycle and electron transport system, energy relations, respiratory quotient", weightage: "high" },
  { subject: "Biology", chapter: "Plant Physiology", name: "Plant growth and development: seed germination, phases and conditions of growth", weightage: "medium" },
  { subject: "Biology", chapter: "Plant Physiology", name: "Differentiation, dedifferentiation and redifferentiation, growth regulators: auxin, gibberellin, cytokinin, ethylene, ABA", weightage: "medium" },

  { subject: "Biology", chapter: "Human Physiology", name: "Breathing and respiration: respiratory organs in animals, respiratory system in humans", weightage: "high" },
  { subject: "Biology", chapter: "Human Physiology", name: "Mechanism of breathing and its regulation, exchange and transport of gases, respiratory volumes", weightage: "high" },
  { subject: "Biology", chapter: "Human Physiology", name: "Disorders related to respiration: asthma, emphysema, occupational respiratory disorders", weightage: "medium" },
  { subject: "Biology", chapter: "Human Physiology", name: "Body fluids and circulation: composition of blood, blood groups, coagulation, lymph", weightage: "high" },
  { subject: "Biology", chapter: "Human Physiology", name: "Human circulatory system: heart, cardiac cycle, cardiac output, ECG, double circulation", weightage: "high" },
  { subject: "Biology", chapter: "Human Physiology", name: "Excretory products and their elimination: modes of excretion, human excretory system, urine formation, osmoregulation", weightage: "high" },
  { subject: "Biology", chapter: "Human Physiology", name: "Regulation of kidney function, disorders, dialysis and artificial kidney", weightage: "medium" },
  { subject: "Biology", chapter: "Human Physiology", name: "Locomotion and movement: types of movement, skeletal muscle, skeletal system, joints", weightage: "medium" },
  { subject: "Biology", chapter: "Human Physiology", name: "Disorders of muscular and skeletal system", weightage: "medium" },
  { subject: "Biology", chapter: "Human Physiology", name: "Neural control and coordination: neuron and nerves, nervous system, generation and conduction of nerve impulse", weightage: "high" },
  { subject: "Biology", chapter: "Human Physiology", name: "Chemical coordination and regulation: endocrine glands and hormones, mechanism of hormone action, disorders", weightage: "high" },

  { subject: "Biology", chapter: "Reproduction", name: "Sexual reproduction in flowering plants: flower structure, development of male and female gametophytes", weightage: "high" },
  { subject: "Biology", chapter: "Reproduction", name: "Pollination: types, agencies, outbreeding devices, pollen-pistil interaction, double fertilisation", weightage: "high" },
  { subject: "Biology", chapter: "Reproduction", name: "Post-fertilisation events: endosperm, embryo, seed and fruit formation, special modes", weightage: "medium" },
  { subject: "Biology", chapter: "Reproduction", name: "Human reproduction: male and female reproductive systems, microscopic anatomy of testis and ovary", weightage: "high" },
  { subject: "Biology", chapter: "Reproduction", name: "Gametogenesis: spermatogenesis and oogenesis, menstrual cycle", weightage: "high" },
  { subject: "Biology", chapter: "Reproduction", name: "Fertilisation, embryo development, implantation, pregnancy, parturition and lactation", weightage: "medium" },
  { subject: "Biology", chapter: "Reproduction", name: "Reproductive health: STD prevention, birth control and contraception, MTP, amniocentesis, assisted reproductive technologies", weightage: "medium" },

  { subject: "Biology", chapter: "Genetics and Evolution", name: "Mendelian inheritance and deviations from Mendelism: incomplete dominance, co-dominance, multiple alleles, pleiotropy", weightage: "high" },
  { subject: "Biology", chapter: "Genetics and Evolution", name: "Chromosome theory of inheritance, chromosomes and genes, sex determination", weightage: "high" },
  { subject: "Biology", chapter: "Genetics and Evolution", name: "Linkage and crossing over, sex-linked inheritance: haemophilia, colour blindness", weightage: "high" },
  { subject: "Biology", chapter: "Genetics and Evolution", name: "Mendelian and chromosomal disorders in humans", weightage: "medium" },
  { subject: "Biology", chapter: "Genetics and Evolution", name: "Molecular basis of inheritance: search for genetic material, structure of DNA and RNA, DNA packaging and replication", weightage: "high", prerequisites: ["Biomolecules: structure and function of proteins, carbohydrates, lipids, nucleic acids"] },
  { subject: "Biology", chapter: "Genetics and Evolution", name: "Central dogma, transcription, genetic code, translation, gene expression and regulation (lac operon)", weightage: "high", prerequisites: ["Molecular basis of inheritance: search for genetic material, structure of DNA and RNA, DNA packaging and replication"] },
  { subject: "Biology", chapter: "Genetics and Evolution", name: "Genome and human genome project, DNA fingerprinting, protein biosynthesis", weightage: "medium" },
  { subject: "Biology", chapter: "Genetics and Evolution", name: "Evolution: origin of life, biological evolution and its evidences", weightage: "medium" },
  { subject: "Biology", chapter: "Genetics and Evolution", name: "Darwin's contribution, modern synthetic theory, mechanism of evolution, natural selection", weightage: "medium" },
  { subject: "Biology", chapter: "Genetics and Evolution", name: "Gene flow, genetic drift, Hardy-Weinberg's principle, adaptive radiation, human evolution", weightage: "medium" },

  { subject: "Biology", chapter: "Biology and Human Welfare", name: "Health and disease, pathogens and parasites causing human diseases", weightage: "medium" },
  { subject: "Biology", chapter: "Biology and Human Welfare", name: "Basic concepts of immunology: vaccines", weightage: "medium" },
  { subject: "Biology", chapter: "Biology and Human Welfare", name: "Cancer, HIV and AIDS", weightage: "medium" },
  { subject: "Biology", chapter: "Biology and Human Welfare", name: "Adolescence, drug and alcohol abuse, tobacco abuse", weightage: "low" },
  { subject: "Biology", chapter: "Biology and Human Welfare", name: "Microbes in human welfare: household food processing, industrial production, sewage treatment, energy generation, biocontrol agents and biofertilizers", weightage: "medium" },

  { subject: "Biology", chapter: "Biotechnology and Its Applications", name: "Principles and process of biotechnology: genetic engineering (recombinant DNA technology)", weightage: "high" },
  { subject: "Biology", chapter: "Biotechnology and Its Applications", name: "Application of biotechnology in health and agriculture: human insulin and vaccine production, gene therapy", weightage: "high" },
  { subject: "Biology", chapter: "Biotechnology and Its Applications", name: "Genetically modified organisms: Bt crops, transgenic animals, biosafety issues, biopiracy and patents", weightage: "medium" },

  { subject: "Biology", chapter: "Ecology and Environment", name: "Organisms and environment, population interactions: mutualism, competition, predation, parasitism", weightage: "medium" },
  { subject: "Biology", chapter: "Ecology and Environment", name: "Population attributes: growth, birth rate, death rate, age distribution", weightage: "medium" },
  { subject: "Biology", chapter: "Ecology and Environment", name: "Ecosystem: patterns, components, productivity and decomposition, energy flow", weightage: "high" },
  { subject: "Biology", chapter: "Ecology and Environment", name: "Pyramids of number, biomass and energy", weightage: "medium" },
  { subject: "Biology", chapter: "Ecology and Environment", name: "Biodiversity and its conservation: concept, patterns, importance, loss of biodiversity", weightage: "high" },
  { subject: "Biology", chapter: "Ecology and Environment", name: "Biodiversity conservation: hotspots, endangered organisms, extinction, Red Data Book, biosphere reserves, national parks, sanctuaries, sacred groves", weightage: "high" },
];

const chaptersBySubject = new Map<string, string[]>();
for (const topic of [...jeeCatalog, ...neetCatalog]) {
  const chapters = chaptersBySubject.get(topic.subject) ?? [];
  if (!chapters.includes(topic.chapter)) chapters.push(topic.chapter);
  chaptersBySubject.set(topic.subject, chapters);
}

for (const topic of [...jeeCatalog, ...neetCatalog]) {
  topic.prerequisites ??= [];
}

async function main() {
  const existing = await db
    .select({ examTrack: topicsTable.examTrack, subject: topicsTable.subject, chapter: topicsTable.chapter, name: topicsTable.name, sortOrder: topicsTable.sortOrder })
    .from(topicsTable);
  const existingKeys = new Set(existing.map((row) => `${row.examTrack}|${row.subject}|${row.chapter}|${row.name}`));
  let nextSortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), 0);

  const rows = [...jeeCatalog.map((topic) => ({ ...topic, examTrack: JEE_TRACK })), ...neetCatalog.map((topic) => ({ ...topic, examTrack: NEET_TRACK }))]
    .filter((topic) => !existingKeys.has(`${topic.examTrack}|${topic.subject}|${topic.chapter}|${topic.name}`))
    .map((topic) => ({ ...topic, sortOrder: ++nextSortOrder }));

  if (rows.length) {
    await db.insert(topicsTable).values(rows);
  }
  console.log(`Seeded ${rows.length} topics (${jeeCatalog.length} JEE + ${neetCatalog.length} NEET in catalog)`);
  for (const [subject, chapters] of chaptersBySubject) {
    console.log(`  ${subject}: ${chapters.join(", ")}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
