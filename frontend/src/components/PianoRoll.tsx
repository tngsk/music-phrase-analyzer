export default function PianoRoll() {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl mb-4 font-semibold">Piano Roll</h2>
      <div className="h-48 bg-gray-700 rounded border border-gray-600 relative overflow-hidden">
        <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-between p-1 opacity-20">
          {[...Array(12)].map((_, i) => (
             <div key={i} className="w-full h-px bg-gray-400"></div>
          ))}
        </div>
        <div className="absolute top-12 left-10 w-24 h-3 bg-blue-500 rounded opacity-80 shadow"></div>
        <div className="absolute top-20 left-40 w-16 h-3 bg-green-500 rounded opacity-80 shadow"></div>
        <div className="absolute top-32 left-60 w-32 h-3 bg-purple-500 rounded opacity-80 shadow"></div>
      </div>
    </div>
  )
}
