"use client";

import { useState } from "react";

const labels = {
  BIKE: "Motorcycle and rider requirements",
  CAR: "Car and driver requirements",
  SUV: "SUV and driver requirements",
  JEEP: "Jeep and driver requirements",
  OTHER: "Vehicle and operator requirements",
} as const;

export function RideVehicleFields({ initialType, initialRequirements }: { initialType: keyof typeof labels; initialRequirements: string }) {
  const [type, setType] = useState(initialType);
  return <>
    <label className="text-sm font-semibold">Vehicle type<select name="vehicleType" value={type} onChange={(event) => setType(event.target.value as keyof typeof labels)} className="field bg-[#101419]"><option>BIKE</option><option>CAR</option><option>SUV</option><option>JEEP</option><option>OTHER</option></select></label>
    <label className="text-sm font-semibold sm:col-span-2">{labels[type]}<textarea required minLength={10} rows={3} name="vehicleRequirements" defaultValue={initialRequirements} className="field" /><span className="mt-2 block text-xs font-normal leading-5 text-zinc-600">State only requirements relevant to the selected vehicle type, including condition, documents, safety equipment, tyres, recovery gear, or minimum capability.</span></label>
  </>;
}
