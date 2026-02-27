# Gmsh Syntax Reference For New Features/Operations

Primary source: [Gmsh Reference Manual](https://gmsh.info/doc/texinfo/gmsh.txt) (Gmsh 4.15.1).

This reference lists verified `.geo` syntax for the operations we are wiring: BRep topology, Physical Groups, embedded boundaries, mesh fields, and mesh export compatibility.

## 1) BRep model semantics (topology)
- Gmsh BRep rule: volume -> surfaces -> curves -> points.
- Embedded entities: points/curves/surfaces can be internal constraints.
- References:
  - `implementation/reference/gmsh.txt:259`
  - `implementation/reference/gmsh.txt:264`

## 2) CAD kernel selection
- Exact syntax:
  - `SetFactory("OpenCASCADE");`
  - `SetFactory("Built-in");`
- References:
  - `implementation/reference/gmsh.txt:5517`
  - `implementation/reference/gmsh.txt:5544`
  - Example: `implementation/reference/gmsh.txt:2619`

## 3) Core geometry syntax
- Points:
  - `Point(tag) = {x, y, z, lc};`
  - Ref: `implementation/reference/gmsh.txt:5571`
- Curves:
  - `Line(tag) = {p1, p2};`
  - `Circle(tag) = {start, center, end};` (arc form)
  - Refs: `implementation/reference/gmsh.txt:5593`, `implementation/reference/gmsh.txt:5614`
- Surface creation:
  - `Curve Loop(tag) = {curve-list};`
  - `Plane Surface(tag) = {curve-loop-list};`
  - Refs: `implementation/reference/gmsh.txt:5644`, `implementation/reference/gmsh.txt:5682`
- Volume primitives (OpenCASCADE):
  - `Box(tag) = {x, y, z, dx, dy, dz};`
  - Ref: `implementation/reference/gmsh.txt:5779`

## 4) Boundary extraction and topology queries
- Exact syntax:
  - `Boundary { TRANSFORM-LIST }`
  - `OrientedBoundary { TRANSFORM-LIST }`
  - `CombinedBoundary { TRANSFORM-LIST }`
  - `OrientedCombinedBoundary { TRANSFORM-LIST }`
- Typical usage:
  - `bnd() = Boundary{ Volume{1}; };`
  - `bnd2() = CombinedBoundary{ Volume{:}; };`
- References:
  - `implementation/reference/gmsh.txt:6021`
  - `implementation/reference/gmsh.txt:6027`
  - `implementation/reference/gmsh.txt:6032`
  - `implementation/reference/gmsh.txt:6039`
  - Examples: `implementation/reference/gmsh.txt:2468`, `implementation/reference/gmsh.txt:2674`

## 5) Physical Groups (solver-facing boundary/material tags)
- Exact syntax forms:
  - `Physical Point ( EXPRESSION | STRING-EXPRESSION <, EXPRESSION> ) <+|->= { EXPRESSION-LIST };`
  - `Physical Curve ( EXPRESSION | STRING-EXPRESSION <, EXPRESSION> ) <+|->= { EXPRESSION-LIST };`
  - `Physical Surface ( EXPRESSION | STRING-EXPRESSION <, EXPRESSION> ) <+|->= { EXPRESSION-LIST };`
  - `Physical Volume ( EXPRESSION | STRING-EXPRESSION <, EXPRESSION> ) <+|->= { EXPRESSION-LIST };`
- References:
  - `implementation/reference/gmsh.txt:5580`
  - `implementation/reference/gmsh.txt:5666`
  - `implementation/reference/gmsh.txt:5741`
  - `implementation/reference/gmsh.txt:5817`
- Export behavior note (important): when physical groups exist, mesh export generally includes only elements in at least one Physical Group unless `Mesh.SaveAll` is used.
- Reference:
  - `implementation/reference/gmsh.txt:598`

## 6) Embedded/internal boundaries
- Exact syntax:
  - `Point{point-tags} In Surface{surface-tags};`
  - `Curve{curve-tags} In Surface{surface-tags};`
  - `Point{point-tags} In Volume{volume-tags};`
  - `Curve{curve-tags} In Volume{volume-tags};`
  - `Surface{surface-tags} In Volume{volume-tags};`
- References/examples:
  - `implementation/reference/gmsh.txt:2541`
  - `implementation/reference/gmsh.txt:2548`
  - `implementation/reference/gmsh.txt:2556`
  - `implementation/reference/gmsh.txt:2561`
  - `implementation/reference/gmsh.txt:2577`
- Remove embedding constraints:
  - `Delete Embedded { <Physical> Point | Curve | Surface | Volume { EXPRESSION-LIST-OR-ALL }; ... }`
  - Ref: `implementation/reference/gmsh.txt:6107`

## 7) Boolean operations (OpenCASCADE)
- Exact syntax:
  - `BooleanIntersection { BOOLEAN-LIST } { BOOLEAN-LIST }`
  - `BooleanUnion { BOOLEAN-LIST } { BOOLEAN-LIST }`
  - `BooleanDifference { BOOLEAN-LIST } { BOOLEAN-LIST }`
  - `BooleanFragments { BOOLEAN-LIST } { BOOLEAN-LIST }`
- Explicit-tag syntax:
  - `BooleanIntersection(tag) = { ... } { ... };`
  - `BooleanUnion(tag) = { ... } { ... };`
  - `BooleanDifference(tag) = { ... } { ... };`
- References:
  - `implementation/reference/gmsh.txt:5930`
  - `implementation/reference/gmsh.txt:5932`
  - `implementation/reference/gmsh.txt:5934`
  - `implementation/reference/gmsh.txt:5936`
  - `implementation/reference/gmsh.txt:5962`
  - `implementation/reference/gmsh.txt:5965`
  - `implementation/reference/gmsh.txt:5968`
  - Example: `implementation/reference/gmsh.txt:2629`

## 8) Extrusion (geometry and mesh)
- Geometry extrusion syntax:
  - `Extrude {dx, dy, dz} { <Physical> Point|Curve|Surface { ... }; ... }`
  - Rotation/twist forms are also available.
- Reference:
  - `implementation/reference/gmsh.txt:5836`
- Mesh+geometry structured extrusion syntax:
  - `Extrude { EXPRESSION-LIST } { EXTRUDE-LIST LAYERS }`
  - Layers forms:
    - `Layers { n }`
    - `Layers { {n1,n2,...}, {h1,h2,...} }`
    - `Recombine;`
- References:
  - `implementation/reference/gmsh.txt:6182`
  - `implementation/reference/gmsh.txt:6188`
  - `implementation/reference/gmsh.txt:6189`
  - `implementation/reference/gmsh.txt:6190`
  - Example with returned tags: `implementation/reference/gmsh.txt:6214`

## 9) Mesh generation command
- Exact syntax:
  - `Mesh EXPRESSION;`
- Typical use:
  - `Mesh 2;` for 2D
  - `Mesh 3;` for 3D
- Reference:
  - `implementation/reference/gmsh.txt:6378`

## 10) Mesh size fields (for refinement and boundary-focused sizing)
- Generic field commands:
  - `Field[id] = STRING;`
  - `Field[id].Option = value;`
  - `Background Field = id;`
- References:
  - `implementation/reference/gmsh.txt:6170`
  - `implementation/reference/gmsh.txt:6172`
  - `implementation/reference/gmsh.txt:6174`

### 10.1 Distance field
- Definition: distance to points/curves/surfaces.
- Key options:
  - `PointsList`, `CurvesList`, `SurfacesList`, `Sampling`
- Reference:
  - `implementation/reference/gmsh.txt:25217`

### 10.2 Threshold field
- Definition: maps an input field into size transition.
- Key options:
  - `InField`, `DistMin`, `DistMax`, `SizeMin`, `SizeMax`, `Sigmoid`, `StopAtDistMax`
- Reference:
  - `implementation/reference/gmsh.txt:25736`

### 10.3 Box field
- Definition: `VIn` inside box, `VOut` outside, optional transition `Thickness`.
- Key options:
  - `XMin`, `XMax`, `YMin`, `YMax`, `ZMin`, `ZMax`, `VIn`, `VOut`, `Thickness`
- Reference:
  - `implementation/reference/gmsh.txt:25069`

### 10.4 BoundaryLayer field
- Definition: inserts a 2D boundary layer mesh near selected curves.
- Key options include:
  - `CurvesList`, `PointsList`, `NbLayers`, `Size`, `SizeFar`, `Ratio`, `Thickness`, `Quads`, etc.
- References:
  - `implementation/reference/gmsh.txt:24994`
  - `implementation/reference/gmsh.txt:25010`
  - `implementation/reference/gmsh.txt:25034`

## 11) Mesh file format compatibility (physical tags preserved)
- Script option:
  - `Mesh.MshFileVersion = x.y;`
- References:
  - `implementation/reference/gmsh.txt:22784`
  - FAQ usage note: `implementation/reference/gmsh.txt:29428`

## 12) Verified templates

### 12.1 Minimal 3D BRep + Physical tags + mesh export
```geo
SetFactory("OpenCASCADE");
Box(1) = {0, 0, 0, 1, 1, 1};

s[] = Boundary{ Volume{1}; };
Physical Surface("wall") = {s[]};
Physical Volume("fluid") = {1};

Mesh.MshFileVersion = 4.1;
Mesh 3;
```

### 12.2 Embedded entities + field-driven sizing
```geo
SetFactory("OpenCASCADE");
Box(1) = {0, 0, 0, 1, 1, 1};

Point(100) = {0.5, 0.5, 0.5, 0.05};
Point{100} In Volume{1};

Field[1] = Distance;
Field[1].PointsList = {100};
Field[1].Sampling = 50;

Field[2] = Threshold;
Field[2].InField = 1;
Field[2].SizeMin = 0.02;
Field[2].SizeMax = 0.20;
Field[2].DistMin = 0.10;
Field[2].DistMax = 0.50;

Background Field = 2;

Mesh.MshFileVersion = 4.1;
Mesh 3;
```

## 13) API references for parity checks (optional)
- OCC box creation:
  - `gmsh.model.occ.addBox(...)`
  - Ref example: `implementation/reference/gmsh.txt:3725`
- Boundary layer API hook:
  - `gmsh/model/mesh/field/setAsBoundaryLayer`
  - Ref: `implementation/reference/gmsh.txt:13228`
- GEO boundary-layer extrusion API:
  - `gmsh/model/geo/extrudeBoundaryLayer`
  - Ref: `implementation/reference/gmsh.txt:14165`
