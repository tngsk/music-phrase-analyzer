interface Props {
  selectedStems: string[];
  onChange: (stems: string[]) => void;
}

export default function StemSelector({ selectedStems, onChange }: Props) {
  const availableStems = ["vocals", "bass", "drums", "guitar", "piano", "other"]
  
  const handleToggle = (stem: string) => {
    if (selectedStems.includes(stem)) {
      onChange(selectedStems.filter(s => s !== stem))
    } else {
      onChange([...selectedStems, stem])
    }
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl mb-4 font-semibold">Stem Selection</h2>
      <div className="flex flex-wrap gap-4">
        {availableStems.map(stem => (
          <label key={stem} className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={selectedStems.includes(stem)}
              onChange={() => handleToggle(stem)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-800" 
            />
            <span className="text-gray-300 capitalize">{stem}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
