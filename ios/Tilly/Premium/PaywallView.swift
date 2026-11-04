import PhosphorSwift
import SwiftUI

/// What Tilly Premium is, and buying it: a real catch turning into its art over
/// Tilly's blue, with the offer on a sheet beneath. Every word is the console's.
struct PaywallView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var busy = false
    @State private var message: String?
    @State private var bought = 0

    var body: some View {
        let t = model.config
        NavigationStack {
            VStack(spacing: 0) {
                VStack(spacing: 14) {
                    VStack(spacing: 6) {
                        Text(t.t("premium.headline"))
                            .font(.system(size: 28, weight: .semibold))
                            .minimumScaleFactor(0.8)
                        Text(t.t("premium.sub"))
                            .font(.body15)
                            .foregroundStyle(.white.opacity(0.85))
                            .lineLimit(3)
                            .minimumScaleFactor(0.85)
                    }
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white)
                    PaywallHero()
                        .frame(maxHeight: .infinity)
                }
                .padding(.horizontal, Theme.margin)
                .padding(.bottom, 16)
                offer
            }
            .background(Theme.brand.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(role: .close) { dismiss() }
                }
                ToolbarItem(placement: .principal) {
                    Wordmark(color: .white, size: 27).fixedSize().accessibilityLabel(model.config.t("website.brand"))
                }
                .sharedBackgroundVisibility(.hidden)
            }
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .task { if model.subscription.package == nil { await model.subscription.loadOffer() } }
            .sensoryFeedback(.success, trigger: bought)
        }
    }

    private var offer: some View {
        let t = model.config
        let store = model.subscription
        return VStack(spacing: 12) {
            if model.art.premium {
                Text(t.t("premium.have")).font(.body15.weight(.semibold))
                Link(t.t("premium.manage"), destination: Subscription.manage).font(.body15)
            } else if store.awaitingPremium {
                Text(t.t("premium.pending")).font(.body15).multilineTextAlignment(.center)
                Button(t.t("premium.checkStatus")) { run { await store.refresh() } }
                    .buttonStyle(.primary)
                    .disabled(busy)
            } else if let package = store.package {
                HStack(spacing: 10) {
                    Ph.checkCircle.fill.frame(width: 22, height: 22).foregroundStyle(Theme.signal)
                    Text(t.t("premium.plan")).font(.body15.weight(.semibold))
                    Spacer()
                    Text(t.t("premium.perMonth", ["price": package.storeProduct.localizedPriceString])).font(.body15)
                }
                .padding(14)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.signal, lineWidth: 2))
                Button {
                    run { await store.buy() }
                } label: {
                    Text(t.t("premium.cta")).frame(maxWidth: .infinity)
                }
                .buttonStyle(.primary)
                .disabled(busy)
                Text(t.t("premium.cancel")).font(.meta).foregroundStyle(Theme.muted)
            } else if store.unavailable {
                Text(t.t("premium.unavailable")).font(.body15).foregroundStyle(Theme.muted)
            } else {
                ProgressView().frame(minHeight: 120)
            }
            if let message {
                Text(message).font(.meta).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            }
            HStack(spacing: 20) {
                if !model.art.premium {
                    Button(t.t("premium.restore")) {
                        run { await store.restore() }
                    }
                    .disabled(busy)
                }
                Link(t.t("premium.terms"), destination: FoirConfig.terms)
                Link(t.t("premium.privacy"), destination: FoirConfig.privacy)
            }
            .font(.meta.weight(.medium))
            .tint(Theme.ink)
            if !model.art.premium {
                Text(t.t("premium.legal"))
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.muted)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .foregroundStyle(Theme.ink)
        .padding(Theme.margin)
        .frame(maxWidth: .infinity)
        .background {
            // Runs on under the home indicator, to the bottom of the screen.
            UnevenRoundedRectangle(topLeadingRadius: 26, topTrailingRadius: 26)
                .fill(Theme.background)
                .ignoresSafeArea(edges: .bottom)
        }
    }

    /// One purchase at a time. A grant belongs to a user, so they sign in first.
    private func run(_ work: @escaping () async -> Subscription.Outcome) {
        guard model.account != nil else {
            model.signInReason = model.config.t("premium.signIn")
            return dismiss()
        }
        busy = true
        message = nil
        Task {
            let outcome = await work()
            busy = false
            switch outcome {
            case .done:
                bought += 1
            case .cancelled:
                break
            case .nothingToRestore:
                message = model.config.t("premium.restored.none")
            case .pending:
                message = nil
            case .failed:
                message = model.config.t("premium.failed")
            }
        }
    }
}

/// A real catch turning into its art and back, inside the glow: what Premium does
/// to a user's own photos, with the same morph as the flip. It rests on the art
/// when the user asks for less motion.
private struct PaywallHero: View {
    /// How long each side shows, in seconds.
    static let photoFor = 1.6
    static let artFor = 3.2

    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var showingArt = false

    var body: some View {
        Color.clear
            .aspectRatio(3 / 4, contentMode: .fit)
            .overlay {
                Image("PaywallPhoto").resizable().scaledToFill().blur(radius: showingArt ? 16 : 0)
            }
            .overlay {
                Image("PaywallArt").resizable().scaledToFill().blur(radius: showingArt ? 0 : 16).opacity(showingArt ? 1 : 0)
            }
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay { IntelligenceGlow(cornerRadius: 20) }
            .accessibilityElement()
            .accessibilityLabel(model.config.t("premium.hero"))
            .task(id: reduceMotion) {
                guard !reduceMotion else { return showingArt = true }
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(showingArt ? Self.artFor : Self.photoFor))
                    guard !Task.isCancelled else { return }
                    withAnimation(ArtFlip<EmptyView>.morph) { showingArt.toggle() }
                }
            }
    }
}
