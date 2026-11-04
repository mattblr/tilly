import Foundation
@main struct Checks {
 static func main() {
  let valid = Data(#"{"samples":6,"breeds":[{"label":"Maine Coon","count":2},{"label":"Siberian","count":4}],"patterns":[{"label":"tabby","count":6}]}"#.utf8)
  guard let e = CatAppearanceEvidence.read(valid) else { fatalError("Valid cat evidence missing") }
  precondition(e.breedShares.first?.label == "Siberian" && e.breedShares.first?.percent == 67)
  precondition(e.patternShares.first?.percent == 100)
  for json in [#"{"samples":0,"breeds":[],"patterns":[]}"#, #"{"samples":1,"breeds":[{"label":"https://bad.test","count":1}],"patterns":[]}"#, #"{"samples":1,"breeds":[{"label":"Maine Coon","count":2}],"patterns":[]}"#] {
   precondition(CatAppearanceEvidence.read(Data(json.utf8)) == nil)
  }
  print("Native public cat evidence: counts, independent pattern shares, empty/malformed refusal pass.")
 }
}
